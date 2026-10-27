import { createContext, useContext, useState } from "react";

// ─── Translations ────────────────────────────────────────────────────────────
const translations = {
  en: {
    // Navbar
    home: "Home",
    draws: "Draws",
    results: "Results",
    myTickets: "My Tickets",
    wallet: "Wallet",
    admin: "Admin",
    signIn: "Sign in",
    getStarted: "Get started",
    signOut: "Sign out",

    // Home
    heroTag: "Commit-reveal provable fairness",
    heroTitle: "A lottery you can",
    heroTitleAccent: "actually trust",
    heroDesc:
      "Every draw is decided by a cryptographically secure seed whose hash is published before sales close. After the draw we reveal the seed so you can verify the result yourself. No black boxes, no do-overs.",
    browseLive: "Browse live draws",
    pastResults: "Past results",
    numbersAuditable: "Numbers auditable",
    serverSeed: "Server seed",
    nextDraw: "Next draw",
    salesCloseIn: "Sales close in",
    jackpot: "Jackpot",
    buyTickets: "Buy tickets",
    watchLive: "Watch live",
    commit: "Commit",
    draw: "Draw",
    revealVerify: "Reveal & verify",
    commitDesc:
      "Before sales open we generate a secret 256-bit seed and publish its SHA-256 hash. The seed stays hidden, but the hash is public.",
    drawDesc:
      "At draw time we add a public client seed. The winning numbers come from a Fisher-Yates shuffle driven by HMAC(seed, client). The seed is locked in, so the operator can't reroll.",
    revealDesc:
      "After the draw we publish the seed. Anyone can check SHA-256(seed) == hash and recompute the winning numbers themselves.",
    noScheduledDraws: "No scheduled draws right now. An admin can create one from the dashboard.",

    // Login
    signInTitle: "Sign in",
    signInSub: "Welcome back. Your wallet and tickets are waiting.",
    email: "Email",
    password: "Password",
    signingIn: "Signing in…",
    newHere: "New here?",
    createAccount: "Create an account",
    demoAdmin: "Demo admin",
    demoAdminDesc: "credentials are pre-filled. Regular users can register to get a sign-up bonus.",

    // Register
    createAccountTitle: "Create account",
    createAccountSub: "New players get a $100 demo bonus in the wallet to start buying tickets.",
    fullName: "Full name",
    atLeast8: "At least 8 characters.",
    creating: "Creating…",
    alreadyHave: "Already have an account?",
    registrationFailed: "Registration failed",

    // Draws
    drawsTitle: "Draws",
    drawsSub: "Open draws you can enter right now.",
    noOpenDraws: "No draws are open for ticket sales. Check back soon.",
    pastFrozen: "Past & frozen draws",
    winning: "Winning",
    ticketsSold: "Tickets sold",
    ticket: "Ticket",
    status: "Status",

    // Buy Tickets
    backToDraws: "← Back to draws",
    perTicket: "per ticket",
    quickPick: "Quick pick",
    clear: "Clear",
    addTicket: "Add ticket",
    yourCart: "Your cart",
    walletBalance: "Wallet balance",
    noTicketsYet: "No tickets yet. Add some numbers above.",
    total: "Total",
    processing: "Processing…",
    insufficientBalance: "Insufficient balance.",
    topUpWallet: "Top up your wallet",
    salesClosed: "Sales are closed for this draw.",
    signInToBuy: "Sign in to buy",
    pickExactly: "Pick exactly",
    numbers: "numbers",

    // Live Draw
    operatorControls: "Operator controls",
    clientSeed: "Client seed (public)",
    freezeSales: "Freeze sales",
    runDraw: "Run draw",
    running: "Running…",
    winningNumbers: "Winning numbers",
    provableFairness: "Provable fairness — verify this draw",
    publishedHash: "published hash",
    serverSeedRevealed: "server seed (revealed)",
    nonce: "nonce",
    hashMatches: "✓ Hash matches the published commitment. This draw is verifiable.",
    computing: "computing…",
    seedHidden: "The server seed stays hidden until the draw runs. After reveal, the values above let you recompute the result independently.",

    // Results
    resultsTitle: "Past results",
    resultsSub: "Completed draws and their winning numbers.",
    noCompletedDraws: "No completed draws yet. Once an admin runs a draw, results appear here.",
    drawn: "Drawn",
    verifyDraw: "Verify this draw →",

    // My Tickets
    myTicketsTitle: "My tickets",
    myTicketsSub: "Your entries across all draws.",
    noTickets: "You don't have any tickets yet.",
    buyFirst: "Buy your first one",
    matched: "Matched",
    draw_: "Draw",

    // Wallet
    walletTitle: "Wallet",
    walletSub: "Your balance and full transaction history.",
    availableBalance: "Available balance",
    topUp: "Top up (demo)",
    add: "Add",
    demoDeposit: "This demo endpoint credits instantly. Production replaces this with a verified payment-gateway webhook.",
    transactions: "Transactions",
    noTransactions: "No transactions yet.",

    // Admin
    adminTitle: "Admin dashboard",
    adminSub: "Schedule draws, manage users, and audit activity.",
    overview: "overview",
    create: "create",
    users: "users",
    audit: "audit",
    ticketSales: "Ticket sales",
    payouts: "Payouts",
    winningTickets: "Winning tickets",
    activeDraws: "Active draws",
    completedDraws: "Completed draws",
    houseMargin: "House margin",
    scheduleNewDraw: "Schedule a new draw",
    scheduleDesc: "A server seed is generated and committed (its hash is published) the moment the draw is created.",
    title: "Title",
    ticketPrice: "Ticket price ($)",
    jackpotAmt: "Jackpot ($)",
    numbersPerTicket: "Numbers per ticket",
    numberRange: "Number range",
    salesCloseAt: "Sales close at",
    drawAt: "Draw at",
    createCommit: "Create & commit seed",
    freeze: "Freeze",
    run: "Run",
    cancel: "Cancel",
    noDrawsYet: "No draws yet. Create one in the Create tab.",
    role: "Role",
    enable: "Enable",
    disable: "Disable",
    noAuditEntries: "No audit entries yet.",
    when: "When",
    actor: "Actor",
    action: "Action",
    detail: "Detail",
    user: "User",
    system: "system",
  },

  am: {
    // Navbar
    home: "ዋና ገጽ",
    draws: "ሎተሪዎች",
    results: "ውጤቶች",
    myTickets: "የእኔ ቲኬቶች",
    wallet: "ቦርሳ",
    admin: "አስተዳዳሪ",
    signIn: "ግባ",
    getStarted: "ጀምር",
    signOut: "ውጣ",

    // Home
    heroTag: "ሊረጋገጥ የሚችል ትክክለኛ ፍትሃዊነት",
    heroTitle: "ሎተሪ",
    heroTitleAccent: "በእውነት ማመን ይችላሉ",
    heroDesc:
      "እያንዳንዱ ሎተሪ ሽያጭ ከመዘጋቱ በፊት ሃሽ የሚወጣለት ምስጢራዊ ዘር ይጠቀማል። ሎተሪ ከተካሄደ በኋላ ዘሩን ይፋ እናደርጋለን ስለዚህ ውጤቱን እርስዎ ማረጋገጥ ይችላሉ።",
    browseLive: "ቀጥታ ሎተሪዎች ይመልከቱ",
    pastResults: "ያለፉ ውጤቶች",
    numbersAuditable: "ቁጥሮች ሊረጋገጡ ይችላሉ",
    serverSeed: "የአገልጋይ ዘር",
    nextDraw: "ቀጣይ ሎተሪ",
    salesCloseIn: "ሽያጭ ይዘጋል",
    jackpot: "ጃክፖት",
    buyTickets: "ቲኬት ግዛ",
    watchLive: "ቀጥታ ተመልከት",
    commit: "ቃል መግባት",
    draw: "ሎተሪ",
    revealVerify: "ይፋ አድርግ እና አረጋግጥ",
    commitDesc: "ሽያጭ ከመጀመሩ በፊት ምስጢራዊ ዘር እናዘጋጃለን ከዚያም የ SHA-256 ሃሽ ይፋ ይደርጋል።",
    drawDesc: "የሎተሪ ጊዜ ሲደርስ የህዝብ ዘር ይጨምራሉ። አሸናፊ ቁጥሮች ከ HMAC(ዘር፣ ደንበኛ) ይወጣሉ።",
    revealDesc: "ከሎተሪ በኋላ ዘሩን ይፋ እናደርጋለን። ማንም SHA-256(ዘር) == ሃሽ ማረጋገጥ ይችላል።",
    noScheduledDraws: "አሁን የተቀመጠ ሎተሪ የለም። አስተዳዳሪ ከዳሽቦርዱ መፍጠር ይችላሉ።",

    // Login
    signInTitle: "ግባ",
    signInSub: "እንኳን ደህና መጡ። ቦርሳዎ እና ቲኬቶቻዎ ይጠብቁዎታል።",
    email: "ኢሜይል",
    password: "የይለፍ ቃል",
    signingIn: "በመግባት ላይ…",
    newHere: "አዲስ ነዎት?",
    createAccount: "መለያ ፍጠር",
    demoAdmin: "ዴሞ አስተዳዳሪ",
    demoAdminDesc: "ምስክርነቶች አስቀድሞ ተሞልተዋል። ተራ ተጠቃሚዎች ሲመዘገቡ ጉርሻ ያገኛሉ።",

    // Register
    createAccountTitle: "መለያ ፍጠር",
    createAccountSub: "አዲስ ተጫዋቾች $100 ዴሞ ጉርሻ ያገኛሉ።",
    fullName: "ሙሉ ስም",
    atLeast8: "ቢያንስ 8 ቁምፊዎች።",
    creating: "በመፍጠር ላይ…",
    alreadyHave: "መለያ አለዎት?",
    registrationFailed: "ምዝገባ አልተሳካም",

    // Draws
    drawsTitle: "ሎተሪዎች",
    drawsSub: "አሁን መግባት የሚችሉ ክፍት ሎተሪዎች።",
    noOpenDraws: "ለሽያጭ ክፍት ሎተሪ የለም። ቆይተው ይመለሱ።",
    pastFrozen: "ያለፉ እና የቀዘቀዙ ሎተሪዎች",
    winning: "አሸናፊ",
    ticketsSold: "ቲኬቶች ተሸጠዋል",
    ticket: "ቲኬት",
    status: "ሁኔታ",

    // Buy Tickets
    backToDraws: "← ወደ ሎተሪዎች ተመለስ",
    perTicket: "በቲኬት",
    quickPick: "ፈጣን ምርጫ",
    clear: "አጽዳ",
    addTicket: "ቲኬት ጨምር",
    yourCart: "ጋሪዎ",
    walletBalance: "የቦርሳ ቀሪ",
    noTicketsYet: "ቲኬት የለም። ከላይ ቁጥሮች ይምረጡ።",
    total: "ድምር",
    processing: "በሂደት ላይ…",
    insufficientBalance: "በቂ ቀሪ የለም።",
    topUpWallet: "ቦርሳ ሙሉ",
    salesClosed: "ለዚህ ሎተሪ ሽያጭ ተዘግቷል።",
    signInToBuy: "ለመግዛት ግባ",
    pickExactly: "በትክክል ምረጥ",
    numbers: "ቁጥሮች",

    // Live Draw
    operatorControls: "የኦፕሬተር ቁጥጥሮች",
    clientSeed: "የደንበኛ ዘር (ይፋ)",
    freezeSales: "ሽያጭ አቁም",
    runDraw: "ሎተሪ ጀምር",
    running: "በሂደት ላይ…",
    winningNumbers: "አሸናፊ ቁጥሮች",
    provableFairness: "ሊረጋገጥ የሚችል ፍትሃዊነት — ሎተሪውን አረጋግጥ",
    publishedHash: "የወጣ ሃሽ",
    serverSeedRevealed: "የአገልጋይ ዘር (ተገለጸ)",
    nonce: "ኖንስ",
    hashMatches: "✓ ሃሽ ከወጣው ቃልኪዳን ጋር ይዛመዳል። ሎተሪው ሊረጋገጥ ይችላል።",
    computing: "በማስላት ላይ…",
    seedHidden: "የአገልጋይ ዘር እስከ ሎተሪ ጊዜ ድረስ ይደበቃል። ከተገለጸ በኋላ ውጤቱን እርስዎ ማስላት ይችላሉ።",

    // Results
    resultsTitle: "ያለፉ ውጤቶች",
    resultsSub: "የተጠናቀቁ ሎተሪዎች እና አሸናፊ ቁጥሮቻቸው።",
    noCompletedDraws: "ገና የተጠናቀቀ ሎተሪ የለም። አስተዳዳሪ ሲያካሂዱ ውጤቶች ይታያሉ።",
    drawn: "ተሎጥሯል",
    verifyDraw: "ሎተሪውን አረጋግጥ →",

    // My Tickets
    myTicketsTitle: "የእኔ ቲኬቶች",
    myTicketsSub: "በሁሉም ሎተሪዎች ያሉ ምዝገባዎቼ።",
    noTickets: "ቲኬት የለዎትም።",
    buyFirst: "የመጀመሪያ ቲኬትዎን ግዙ",
    matched: "ያዛመዱ",
    draw_: "ሎተሪ",

    // Wallet
    walletTitle: "ቦርሳ",
    walletSub: "ቀሪዎ እና ሙሉ ግብይት ታሪክ።",
    availableBalance: "ያለው ቀሪ",
    topUp: "ቀሪ ሙሉ (ዴሞ)",
    add: "ጨምር",
    demoDeposit: "ይህ ዴሞ ወዲያውኑ ይጨምራል። ምርት ላይ የክፍያ ፖርታል ይተካዋል።",
    transactions: "ግብይቶች",
    noTransactions: "ግብይት የለም።",

    // Admin
    adminTitle: "የአስተዳዳሪ ዳሽቦርድ",
    adminSub: "ሎተሪዎችን ይቅዱ፣ ተጠቃሚዎችን ያስተዳድሩ እና ድርጊቶችን ይከታተሉ።",
    overview: "አጠቃላይ እይታ",
    create: "ፍጠር",
    users: "ተጠቃሚዎች",
    audit: "ምርመራ",
    ticketSales: "የቲኬት ሽያጭ",
    payouts: "ክፍያዎች",
    winningTickets: "አሸናፊ ቲኬቶች",
    activeDraws: "ንቁ ሎተሪዎች",
    completedDraws: "የተጠናቀቁ ሎተሪዎች",
    houseMargin: "የቤት ትርፍ",
    scheduleNewDraw: "አዲስ ሎተሪ ይቀምጡ",
    scheduleDesc: "ሎተሪ ሲፈጠር ወዲያውኑ የአገልጋይ ዘር ይወጣና ሃሹ ይፋ ይደርጋል።",
    title: "ርዕስ",
    ticketPrice: "የቲኬት ዋጋ ($)",
    jackpotAmt: "ጃክፖት ($)",
    numbersPerTicket: "ቁጥሮች በቲኬት",
    numberRange: "የቁጥር ክልል",
    salesCloseAt: "ሽያጭ ሚዘጋ ጊዜ",
    drawAt: "የሎተሪ ጊዜ",
    createCommit: "ፍጠር እና ዘር ቃል ግባ",
    freeze: "አቁም",
    run: "ሂድ",
    cancel: "ሰርዝ",
    noDrawsYet: "ሎተሪ የለም። በፍጠር ትር ፍጠር።",
    role: "ሚና",
    enable: "አንቃ",
    disable: "አጥፋ",
    noAuditEntries: "ምርመራ ግቤቶች የሉም።",
    when: "መቼ",
    actor: "አካሄጅ",
    action: "ድርጊት",
    detail: "ዝርዝር",
    user: "ተጠቃሚ",
    system: "ስርዓት",
  },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lp_lang") || "en");

  function toggle() {
    const next = lang === "en" ? "am" : "en";
    setLang(next);
    localStorage.setItem("lp_lang", next);
  }

  const t = (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
