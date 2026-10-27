"""Provably-fair draw engine.

Design (commit-reveal scheme):

1. COMMIT  - when an admin creates a draw we generate a cryptographically secure
            `server_seed` (OS entropy via `secrets`). We store the seed privately
            and publish only its SHA-256 hash. Anyone can see the hash while sales
            are open, but nobody can derive the seed from it.

2. FREEZE  - just before the draw, sales close. At draw time we capture a public
            `client_seed` (e.g. a well-known future value such as a block hash or
            a published community value). Because the server seed was already
            committed via its hash, the operator cannot retroactively pick a seed
            that favours certain tickets.

3. REVEAL  - we derive the winning numbers from HMAC(server_seed, client_seed:nonce)
            using a deterministic shuffle-and-extract algorithm, then reveal the
            server_seed. Players can recompute the same numbers and verify that
            SHA-256(server_seed) == the published hash.

Why not `random` / `Math.random()`? Those are non-CSPRNG, predictable, and not
auditable. We use `secrets` (OS entropy) for seed generation and a keyed HMAC
for the draw itself so the result is both unbiased and independently verifiable.
"""
import hashlib
import hmac
import secrets

from .models import Draw


def generate_server_seed() -> str:
    """Cryptographically secure random seed (32 bytes -> urlsafe base64)."""
    return secrets.token_urlsafe(32)


def hash_seed(seed: str) -> str:
    """SHA-256 hex digest of the server seed (the public commitment)."""
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def draw_entirely_random(count: int, lo: int, hi: int) -> list[int]:
    """Generate `count` distinct numbers in [lo, hi] using a CSPRNG.

    Used for the reveal computation AND for quick-pick tickets.
    """
    pool = list(range(lo, hi + 1))
    # secrets.SystemRandom uses OS entropy, not the deterministic Mersenne Twister.
    rng = secrets.SystemRandom()
    rng.shuffle(pool)
    return sorted(pool[:count])


def _hmac_stream(server_seed: str, client_seed: str, nonce: int) -> bytes:
    """A long, deterministic byte stream derived from the committed seeds.

    We repeatedly HMAC an incrementing counter so the stream is reproducible
    only by someone who knows server_seed (the secret revealed after the draw).
    """
    key = server_seed.encode("utf-8")
    message_base = f"{client_seed}:{nonce}".encode("utf-8")
    out = bytearray()
    counter = 0
    while len(out) < 64:  # plenty of bytes for the shuffle below
        out += hmac.new(key, message_base + str(counter).encode(), hashlib.sha256).digest()
        counter += 1
    return bytes(out)


def compute_winning_numbers(
    draw: Draw, client_seed: str, nonce: int
) -> list[int]:
    """Derive winning numbers deterministically from committed seeds.

    Algorithm (Fisher-Yates shuffle driven by the HMAC stream):
      - Build the full candidate pool [lo .. hi].
      - Shuffle it using bytes pulled from the HMAC stream (rejection sampling
        to keep the distribution uniform).
      - Take the first `numbers_per_ticket` entries and sort them.

    Because the output depends only on (server_seed, client_seed, nonce) and the
    server_seed's hash was published pre-draw, this is fully auditable.
    """
    pool = list(range(draw.number_min, draw.number_max + 1))
    stream = _hmac_stream(draw.server_seed, client_seed, nonce)
    s_idx = 0
    n = len(pool)

    for i in range(n - 1, 0, -1):
        # rejection-sample a uniform index in [0, i] from the stream.
        # `limit` is the largest multiple of (i + 1) that fits in a byte, so every
        # accepted byte maps uniformly to [0, i] via byte % (i + 1).
        limit = 256 - (256 % (i + 1))
        while True:
            byte = stream[s_idx % len(stream)]
            s_idx += 1
            if byte < limit:
                j = byte % (i + 1)
                pool[i], pool[j] = pool[j], pool[i]
                break

    chosen = sorted(pool[: draw.numbers_per_ticket])
    return chosen


def verify_draw(draw: Draw) -> bool:
    """Let a player re-verify a completed draw.

    Checks that the published hash matches the revealed server seed, and that
    re-running the algorithm reproduces the stored winning numbers.
    """
    if not draw.server_seed or not draw.server_seed_hash or not draw.winning_numbers:
        return False
    if hash_seed(draw.server_seed) != draw.server_seed_hash:
        return False
    if not draw.client_seed:
        return False
    recomputed = compute_winning_numbers(draw, draw.client_seed, draw.nonce)
    return recomputed == draw.winning_numbers
