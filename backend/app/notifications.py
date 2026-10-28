"""Email notifications via Resend."""
import logging
from .config import settings

logger = logging.getLogger(__name__)


def send_ticket_confirmation(
    to_email: str,
    full_name: str,
    lottery_title: str,
    ticket_nos: list[str],
    draw_date: str,
) -> None:
    """Send ticket confirmation email. Fails silently so payments are not blocked."""
    if not settings.RESEND_API_KEY or not to_email:
        if not settings.RESEND_API_KEY:
            logger.info("RESEND_API_KEY not set — skipping email to %s", to_email)
        return
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY

        tickets_html = "".join(f"<li><strong>{t}</strong></li>" for t in ticket_nos)
        html = f"""
        <h2>Your lottery tickets are confirmed! 🎟️</h2>
        <p>Hi {full_name},</p>
        <p>Your payment for <strong>{lottery_title}</strong> has been verified.
           Your ticket numbers are:</p>
        <ul>{tickets_html}</ul>
        <p>Draw date: <strong>{draw_date}</strong></p>
        <p>Good luck!</p>
        """
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": f"Ticket Confirmed — {lottery_title}",
            "html": html,
        })
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)


def send_winner_notification(to_email: str | None, full_name: str,
                             lottery_title: str, ticket_no: str) -> None:
    if not settings.RESEND_API_KEY or not to_email:
        return
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": f"🏆 You won! — {lottery_title}",
            "html": f"""
            <h2>Congratulations {full_name}! 🏆</h2>
            <p>Your ticket <strong>{ticket_no}</strong> is a winning ticket
               for <strong>{lottery_title}</strong>!</p>
            <p>Please contact us to claim your prize.</p>
            """,
        })
    except Exception as exc:
        logger.error("Failed to send winner email to %s: %s", to_email, exc)
