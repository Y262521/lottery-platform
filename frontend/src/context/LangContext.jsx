import { createContext, useContext, useState } from "react";

const translations = {
  en: {
    // Brand
    brandName: "Yonas & Robel Online Lottery",
    brandSub: "Direct-Purchase Lottery",
    // Navbar
    home: "Home",
    myTickets: "My Tickets",
    admin: "Admin",
    signIn: "Sign in",
    getStarted: "Get started",
    signOut: "Sign out",

    // Home hero
    heroTag: "Direct-purchase lottery platform",
    heroTitle: "Your ticket to",
    heroTitleAccent: "winning",
    heroDesc: "Browse active lottery events, buy tickets directly, and watch transparent draw results with video proof.",
    noOpenDraws: "No active lotteries right now. Check back soon.",
    draws: "Lotteries",
    pastFrozen: "Past Draws",
    ticket: "Ticket",
    ticketsSold: "tickets sold",
    verifyDraw: "View Results →",
    buyTickets: "Buy Tickets",

    // Auth
    signInTitle: "Sign in",
    signInSub: "Welcome back.",
    email: "Email",
    password: "Password",
    signingIn: "Signing in…",
    newHere: "New here?",
    createAccount: "Create an account",
    demoAdmin: "Demo admin",
    demoAdminDesc: "credentials are pre-filled.",
    createAccountTitle: "Create account",
    createAccountSub: "Register to start buying lottery tickets.",
    fullName: "Full name",
    phone: "Phone (optional)",
    atLeast8: "At least 8 characters.",
    creating: "Creating…",
    alreadyHave: "Already have an account?",
    registrationFailed: "Registration failed",

    // Lottery detail
    prize: "Prize",
    drawDate: "Draw Date",
    remaining: "Remaining",
    quantity: "Quantity",
    maxPerUser: "Max per user",
    paymentMethod: "Payment method",
    telebirrPhone: "Telebirr Phone",
    bankTransferNote: "After clicking Buy, you'll receive bank account details. Your tickets are confirmed once an admin verifies your transfer.",
    total: "Total",
    processing: "Processing…",
    salesClosed: "Ticket sales are closed.",
    viewResults: "View draw results →",
    signInToBuy: "Sign in to buy",

    // Draw results
    drawResults: "Draw Results & Verification",
    winningNumbers: "Winning Ticket Numbers",
    drawVideoProof: "Draw Video Proof",
    photoEvidence: "Photo Evidence",
    winners: "Winners",
    resultsNotPublished: "Results have not been published yet.",
    publishedOn: "Published",

    // Payment callback
    bankTransferTitle: "Bank Transfer Instructions",
    bankTransferDesc: "Please transfer the exact amount to the following account and send your receipt to our support team for verification.",
    bank: "Bank",
    account: "Account",
    reference: "Reference",
    bankConfirmNote: "Your tickets will be confirmed once the admin verifies your payment.",
    checkYourPhone: "Check Your Phone",
    telebirrPushSent: "A Telebirr USSD push has been sent to your phone. Approve the payment to confirm your tickets.",
    telebirrPending: "Your tickets will appear in \"My Tickets\" once approved.",
    paymentConfirmed: "Payment Confirmed!",
    ticketsGenerated: "Your tickets have been generated and a confirmation email has been sent.",
    viewMyTickets: "View My Tickets",
    browseMore: "Browse More Lotteries",

    // My tickets
    myTicketsTitle: "My Tickets",
    myTicketsSub: "All your lottery entries.",
    noTickets: "No tickets yet.",
    browseDesc: "Browse lotteries",
    confirmed: "Confirmed",

    // Admin dashboard
    adminTitle: "Admin Dashboard",
    newLottery: "+ New Lottery",
    revenue: "Revenue (ETB)",
    winningTickets: "Winners",
    activeLotteries: "Active Lotteries",
    users: "Users",
    pendingPayments: "Pending Payments",
    lotteries: "Lotteries",
    manageDesc: "Create, manage and publish draw results",
    transactions: "Transactions",
    transactionsDesc: "Review payments and confirm bank transfers",
    usersDesc: "Manage roles and account status",

    // Admin lotteries
    all: "All",
    manage: "Manage",
    publish: "Publish",
    closeSales: "Close Sales",
    sold: "Sold",
    price: "Price",
    noLotteries: "No lotteries found.",

    // Admin lottery form
    createLottery: "Create New Lottery",
    titleField: "Title *",
    description: "Description",
    prizeDescription: "Prize Description *",
    ticketPrice: "Ticket Price (ETB) *",
    totalTickets: "Total Tickets (blank = unlimited)",
    maxTicketsPerUser: "Max Tickets Per User *",
    drawDateField: "Draw Date *",
    salesOpenAt: "Sales Open At",
    salesCloseAt: "Sales Close At",
    coverImage: "Cover Image (optional)",
    prizeImages: "Prize Images (optional, multiple)",
    createDraft: "Create Lottery (Save as Draft)",
    cancel: "Cancel",

    // Admin lottery manage
    backToLotteries: "← Lotteries",
    actions: "Actions",
    openSales: "Publish (Open Sales)",
    cancelLottery: "Cancel Lottery",
    viewPublicPage: "View Public Page ↗",
    capacity: "Capacity",
    unlimited: "Unlimited",
    revenueLabel: "Revenue",
    publishResults: "Publish Draw Results",
    winningTicketNos: "Winning Ticket Numbers (comma-separated) *",
    winningPlaceholder: "LP001-00042, LP001-00107",
    notes: "Notes (optional)",
    drawVideoProofUpload: "Draw Video Proof (optional)",
    photoEvidenceUpload: "Photo Evidence (optional)",
    publishResultsBtn: "Publish Results & Notify Winners",
    publishing: "Publishing…",
    resultsPublished: "Results Published ✓",
    uploadVideo: "Upload Video",
    viewVideo: "View Video ↗",
    confirmedTickets: "Confirmed Tickets",
    noConfirmedTickets: "No confirmed tickets yet.",

    // Admin transactions
    txnId: "ID",
    txnUser: "User",
    txnLottery: "Lottery",
    txnAmount: "Amount",
    txnGateway: "Gateway",
    txnStatus: "Status",
    txnTickets: "Tickets",
    txnDate: "Date",
    confirmPayment: "Confirm",
    noTransactions: "No transactions yet.",

    // Admin users
    usersTitle: "Users",
    userCol: "User",
    roleCol: "Role",
    statusCol: "Status",
    joinedCol: "Joined",
    active: "Active",
    disabled: "Disabled",
    enable: "Enable",
    disable: "Disable",
    updated: "Updated ✓",

    // General
    loading: "Loading…",
    back: "← Back",
    drawAt: "Draw Date",
    status: "Status",

    // Lottery & ticket statuses (shown in UI)
    statusDRAFT:           "Draft",
    statusACTIVE:          "Active",
    statusCLOSED:          "Closed",
    statusDRAWN:           "Drawn",
    statusCANCELLED:       "Cancelled",
    statusPENDING:         "Pending",
    statusPENDING_PAYMENT: "In Progress",
    statusCONFIRMED:       "Confirmed",
    statusWON:             "Won 🏆",
    statusLOST:            "Lost",
    statusSUCCESS:         "Confirmed",
    statusFAILED:          "Rejected",
    statusREFUNDED:        "Refunded",

    // My tickets grouped view
    paymentInProgress:   "Payment In Progress",
    paymentConfirmedLbl: "Payment Confirmed",
    paymentRejected:     "Payment Rejected",
    ticketNo:            "Ticket No.",
    chosenNo:            "Your number",
    noTicketsForLottery: "No tickets for this lottery.",
    paymentRef:          "Ref",
    submittedOn:         "Submitted",
    lottery:             "Lottery",

    // Payment proof
    makePayment: "Make Payment",
    transferTo: "Transfer ETB {amount} to the account below",
    telebirrRef: "Telebirr Transaction Reference *",
    bankRef: "Bank Reference / Slip Number *",
    senderName: "Sender Name (as on transfer) *",
    senderNamePh: "Your name",
    phoneLbl: "Phone Number (optional)",
    messageLbl: "Message / Note (optional)",
    messagePh: "e.g. Lottery ticket payment for...",
    screenshotLbl: "Payment Screenshot (optional but recommended)",
    screenshotHelp: "Upload a screenshot of your Telebirr/bank receipt as proof",
    submitRef: "Submit Payment Reference",
    submitting: "Submitting…",
    paymentSubmitted: "Payment Submitted!",
    paymentSubmittedDesc: "Admin will verify your payment and issue your tickets. Keep your reference number safe.",
    referenceLabel: "Reference:",
    trackTickets: "Track status in My Tickets",
    continueBtn: "Continue → Pay ({qty} ticket{s})",
    backBtn: "← Back",
    afterTransfer: "After transferring, enter your reference number and optionally upload a screenshot. Admin verifies and issues tickets.",
  },

  am: {
    // Brand
    brandName: "እድል ኦንላይን እጣ",
    brandSub: "እድል የኦንላይን መድረክ",
    // Navbar
    home: "ዋና ገጽ",
    myTickets: "የእኔ ቲኬቶች",
    admin: "አስተዳዳሪ",
    signIn: "ግባ",
    getStarted: "ጀምር",
    signOut: "ውጣ",

    // Home hero
    heroTitle: "የእድሎን",
    heroTitleAccent: "በእድል ኦንላይን እጣ ይሞክሩ",
    heroDesc: "አሁን ያሉ እጣዎችን ይዬ እና የእጣ ቁጥሮን በቀጥታ ይግዙ",
    noOpenDraws: "አሁን ንቁ ሎተሪ የለም። ቆይተው ይመለሱ።",
    draws: "ዕጣዎች",
    pastFrozen: "ያለፉ ዕጣዎች",
    ticket: "ቲኬት",
    ticketsSold: "ቲኬቶች ተሸጠዋል",
    verifyDraw: "ውጤቶችን ይመልከቱ →",
    buyTickets: "ቲኬቶች ይግዙ",

    // Auth
    signInTitle: "ግባ",
    signInSub: "እንኳን ደህና መጡ።",
    email: "ኢሜይል",
    password: "የይለፍ ቃል",
    signingIn: "በመግባት ላይ…",
    newHere: "አዲስ ነዎት?",
    createAccount: "መለያ ፍጠር",
    demoAdmin: "ዴሞ አስተዳዳሪ",
    demoAdminDesc: "ምስክርነቶች አስቀድሞ ተሞልተዋል።",
    createAccountTitle: "መለያ ፍጠር",
    createAccountSub: "ሎተሪ ቲኬቶችን ለመግዛት ይመዝገቡ።",
    fullName: "ሙሉ ስም",
    phone: "ስልክ (አማራጭ)",
    atLeast8: "ቢያንስ 8 ቁምፊዎች።",
    creating: "በመፍጠር ላይ…",
    alreadyHave: "መለያ አለዎት?",
    registrationFailed: "ምዝገባ አልተሳካም",

    // Lottery detail
    prize: "ሽልማት",
    drawDate: "የዕጣ ቀን",
    remaining: "ቀሪ",
    quantity: "ብዛት",
    maxPerUser: "ከፍተኛ በተጠቃሚ",
    paymentMethod: "የክፍያ ዘዴ",
    telebirrPhone: "Telebirr ስልክ",
    bankTransferNote: "ከገዙ በኋላ የባንክ ዝርዝሮች ይደርሱዎታል። አስተዳዳሪ ሲያረጋግጥ ቲኬቶቹ ይሰጡዎታል።",
    total: "ድምር",
    processing: "በሂደት ላይ…",
    salesClosed: "ሽያጭ ተዘግቷል።",
    viewResults: "ውጤቶችን ይመልከቱ →",
    signInToBuy: "ለመግዛት ግባ",

    // Draw results
    drawResults: "የዕጣ ውጤቶች",
    winningNumbers: "አሸናፊ ቲኬት ቁጥሮች",
    drawVideoProof: "የዕጣ ቪዲዮ ማስረጃ",
    photoEvidence: "የፎቶ ማስረጃ",
    winners: "አሸናፊዎች",
    resultsNotPublished: "ውጤቶች ገና አልወጡም።",
    publishedOn: "የወጣበት ቀን",

    // Payment callback
    bankTransferTitle: "የባንክ ዝውውር መመሪያ",
    bankTransferDesc: "ትክክለኛውን መጠን ወደ ሂሳቡ ያስተላልፉ እና 영수증ዎን ለድጋፍ ቡድናችን ይላኩ።",
    bank: "ባንክ",
    account: "ሂሳብ",
    reference: "ማጣቀሻ",
    bankConfirmNote: "አስተዳዳሪ ክፍያዎን ሲያረጋግጥ ቲኬቶቹ ይሰጡዎታል።",
    checkYourPhone: "ስልክዎን ያረጋግጡ",
    telebirrPushSent: "ወደ ስልክዎ Telebirr USSD ላኩ። ቲኬቶቹን ለማረጋገጥ ክፍያውን ያጽድቁ።",
    telebirrPending: "ካጸደቁ በኋላ ቲኬቶቹ 'የእኔ ቲኬቶች' ውስጥ ይታያሉ።",
    paymentConfirmed: "ክፍያ ተረጋግጧል!",
    ticketsGenerated: "ቲኬቶቹ ተፈጥረዋል እና ማረጋገጫ ኢሜይል ተልኳል።",
    viewMyTickets: "የእኔ ቲኬቶችን ይመልከቱ",
    browseMore: "ተጨማሪ ሎተሪዎችን ይዳስሱ",

    // My tickets
    myTicketsTitle: "የእኔ ቲኬቶች",
    myTicketsSub: "ሁሉም የሎተሪ ምዝገባዎቼ።",
    noTickets: "ቲኬት የለዎትም።",
    browseDesc: "ሎተሪዎችን ይዳስሱ",
    confirmed: "ተረጋግጧል",

    // Admin dashboard
    adminTitle: "የአስተዳዳሪ ዳሽቦርድ",
    newLottery: "+ አዲስ ሎተሪ",
    revenue: "ገቢ (ETB)",
    winningTickets: "አሸናፊዎች",
    activeLotteries: "ንቁ ሎተሪዎች",
    users: "ተጠቃሚዎች",
    pendingPayments: "በሂደት ላይ ያሉ ክፍያዎች",
    lotteries: "ሎተሪዎች",
    manageDesc: "ሎተሪዎችን ፍጠሩ፣ ያስተዳድሩ እና ውጤቶችን ያወጡ",
    transactions: "ግብይቶች",
    transactionsDesc: "ክፍያዎችን ይከልሱ እና የባንክ ዝውውሮችን ያረጋግጡ",
    usersDesc: "ሚናዎችን እና የሂሳብ ሁኔታ ያስተዳድሩ",

    // Admin lotteries
    all: "ሁሉም",
    manage: "አስተዳድር",
    publish: "አሳትም",
    closeSales: "ሽያጭ ዝጋ",
    sold: "ተሸጧል",
    price: "ዋጋ",
    noLotteries: "ሎተሪ አልተገኘም።",

    // Admin lottery form
    createLottery: "አዲስ ሎተሪ ፍጠር",
    titleField: "ርዕስ *",
    description: "መግለጫ",
    prizeDescription: "የሽልማት መግለጫ *",
    ticketPrice: "የቲኬት ዋጋ (ETB) *",
    totalTickets: "ጠቅላላ ቲኬቶች (ባዶ = ያልተወሰነ)",
    maxTicketsPerUser: "ከፍተኛ ቲኬቶች በተጠቃሚ *",
    drawDateField: "የዕጣ ቀን *",
    salesOpenAt: "ሽያጭ የሚከፈትበት ጊዜ",
    salesCloseAt: "ሽያጭ የሚዘጋበት ጊዜ",
    coverImage: "ሽፋን ምስል (አማራጭ)",
    prizeImages: "የሽልማት ምስሎች (አማራጭ)",
    createDraft: "ሎተሪ ፍጠር (ረቂቅ አስቀምጥ)",
    cancel: "ሰርዝ",

    // Admin lottery manage
    backToLotteries: "← ሎተሪዎች",
    actions: "ድርጊቶች",
    openSales: "አሳትም (ሽያጭ ክፈት)",
    cancelLottery: "ሎተሪ ሰርዝ",
    viewPublicPage: "ህዝባዊ ገጽ ይመልከቱ ↗",
    capacity: "ብዛት",
    unlimited: "ያልተወሰነ",
    revenueLabel: "ገቢ",
    publishResults: "የዕጣ ውጤቶች ያሳትሙ",
    winningTicketNos: "አሸናፊ ቲኬት ቁጥሮች (በኮማ ይለዩ) *",
    winningPlaceholder: "LP001-00042, LP001-00107",
    notes: "ማስታወሻ (አማራጭ)",
    drawVideoProofUpload: "የዕጣ ቪዲዮ ማስረጃ (አማራጭ)",
    photoEvidenceUpload: "የፎቶ ማስረጃ (አማራጭ)",
    publishResultsBtn: "ውጤቶች ያሳትሙ እና አሸናፊዎችን ያሳውቁ",
    publishing: "በማሳተም ላይ…",
    resultsPublished: "ውጤቶች ታትመዋል ✓",
    uploadVideo: "ቪዲዮ ስቀል",
    viewVideo: "ቪዲዮ ይመልከቱ ↗",
    confirmedTickets: "የተረጋገጡ ቲኬቶች",
    noConfirmedTickets: "ገና የተረጋገጠ ቲኬት የለም።",

    // Admin transactions
    txnId: "መ/ቁ",
    txnUser: "ተጠቃሚ",
    txnLottery: "ሎተሪ",
    txnAmount: "መጠን",
    txnGateway: "መግቢያ",
    txnStatus: "ሁኔታ",
    txnTickets: "ቲኬቶች",
    txnDate: "ቀን",
    confirmPayment: "አረጋግጥ",
    noTransactions: "ገና ግብይት የለም።",

    // Admin users
    usersTitle: "ተጠቃሚዎች",
    userCol: "ተጠቃሚ",
    roleCol: "ሚና",
    statusCol: "ሁኔታ",
    joinedCol: "የተቀላቀሉበት",
    active: "ንቁ",
    disabled: "ተሰናክሏል",
    enable: "አንቃ",
    disable: "አጥፋ",
    updated: "ተዘምኗል ✓",

    // General
    loading: "በመጫን ላይ…",
    back: "← ተመለስ",
    drawAt: "የዕጣ ቀን",
    status: "ሁኔታ",

    // Payment proof
    makePayment: "ክፍያ ያካሂዱ",
    transferTo: "ETB {amount} ወደ ታች ወደ አለው አካዉንት ያስተላልፉ",
    telebirrRef: "Telebirr ማጣቀሻ ቁጥር *",
    bankRef: "የባንክ ማጣቀሻ / ደረሰኝ ቁጥር *",
    senderName: "የላኪ ስም *",
    senderNamePh: "ስምዎ",
    phoneLbl: "ስልክ ቁጥር (አማራጭ)",
    messageLbl: "መልዕክት / ማስታወሻ (አማራጭ)",
    messagePh: "ለምሳሌ: ሎተሪ ቲኬት ክፍያ...",
    screenshotLbl: "የክፍያ ስክሪንሾት (አማራጭ ነገር ግን ይመከራል)",
    screenshotHelp: "የ Telebirr/ባንክ ደረሰኝ ስክሪንሾት ይስቀሉ",
    submitRef: "ክፍያ አስረከብ",
    submitting: "በማስገባት ላይ…",
    paymentSubmitted: "ክፍያ ቀርቧል!",
    paymentSubmittedDesc: "አስተዳዳሪ ክፍያዎን ሲያረጋግጥ ቲኬቶቹ ይላካሉ። ማጣቀሻ ቁጥርዎን ያስቀምጡ።",
    referenceLabel: "ማጣቀሻ:",
    trackTickets: "የእኔ ቲኬቶች ውስጥ ሁኔታ ይከታተሉ",
    continueBtn: "ቀጥል → ክፍያ ({qty} ቲኬት{s})",
    backBtn: "← ተመለስ",
    afterTransfer: "ካስተላለፉ በኋላ ማጣቀሻ ቁጥሩን ያስገቡ እና ስክሪንሾት ይስቀሉ። አስተዳዳሪ ያረጋግጣል።",

    // Lottery & ticket statuses
    statusDRAFT:           "ረቂቅ",
    statusACTIVE:          "ንቁ",
    statusCLOSED:          "ተዘግቷል",
    statusDRAWN:           "ዕጣ ተወስዷል",
    statusCANCELLED:       "ተሰርዟል",
    statusPENDING:         "በሂደት ላይ",
    statusPENDING_PAYMENT: "በሂደት ላይ",
    statusCONFIRMED:       "ተረጋግጧል",
    statusWON:             "አሸንፈዋል 🏆",
    statusLOST:            "አልተሳካም",
    statusSUCCESS:         "ተረጋግጧል",
    statusFAILED:          "ተቀባይነት አላገኘም",
    statusREFUNDED:        "ተመልሷል",

    // My tickets grouped view
    paymentInProgress:   "ክፍያ በሂደት ላይ",
    paymentConfirmedLbl: "ክፍያ ተረጋግጧል",
    paymentRejected:     "ክፍያ ተቀባይነት አላገኘም",
    ticketNo:            "የቲኬት ቁጥር",
    chosenNo:            "የመረጡት ቁጥር",
    noTicketsForLottery: "ለዚህ ሎተሪ ቲኬት የለም።",
    paymentRef:          "ማጣቀሻ",
    submittedOn:         "የቀረበ ቀን",
    lottery:             "ሎተሪ",
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
