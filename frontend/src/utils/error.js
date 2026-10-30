/**
 * Formats errors into clear, polite, and user-friendly messages in either Amharic or English.
 * Handles network failures, server cold-starts, validation errors, and dual-language API responses.
 *
 * @param {Error|string|object} err - The error to format
 * @param {string} lang - 'am' or 'en'
 * @returns {string} User-friendly message
 */
export function formatError(err, lang = "en") {
  if (!err) return "";

  let message = "";
  let status = null;

  if (typeof err === "string") {
    message = err.trim();
  } else if (typeof err === "object") {
    status = err.status || err.statusCode || null;
    message = (err.message || err.detail || (typeof err.toString === "function" ? err.toString() : "")).trim();
  }

  // 1. Check for network / connection errors (Render cold start, offline, CORS, server down)
  const isNetwork =
    /failed to fetch/i.test(message) ||
    /networkerror/i.test(message) ||
    /network error/i.test(message) ||
    /load failed/i.test(message) ||
    /connection refused/i.test(message) ||
    /aborted/i.test(message) ||
    message === "TypeError: Failed to fetch" ||
    status === 0;

  if (isNetwork) {
    return lang === "am"
      ? "ከአገልጋይ ጋር መገናኘት አልተቻለም። እባክዎ የበይነመረብ (Internet) ግንኙነትዎን ያረጋግጡ ወይም ጥቂት ሰከንዶች ቆይተው እንደገና ይሞክሩ።"
      : "Unable to connect to the server. Please check your internet connection or try again in a few moments.";
  }

  // 2. If the backend sent a dual-language message formatted as "Amharic / English"
  if (message.includes(" / ")) {
    const parts = message.split(" / ");
    const amPart = parts[0]?.trim();
    const enPart = parts.slice(1).join(" / ")?.trim();
    if (lang === "am" && amPart) return amPart;
    if (lang === "en" && enPart) return enPart;
  }

  const lower = message.toLowerCase();

  // 3. Authentication & Account
  if (
    lower.includes("invalid credential") ||
    lower.includes("incorrect username or password") ||
    lower.includes("invalid phone/email or password")
  ) {
    return lang === "am"
      ? "የተሳሳተ ስልክ ቁጥር/ኢሜይል ወይም የይለፍ ቃል። እባክዎ መረጃዎን አረጋግጠው እንደገና ይሞክሩ።"
      : "Incorrect phone number, email, or password. Please check your details and try again.";
  }
  if (
    lower.includes("account disabled") ||
    lower.includes("account is disabled") ||
    lower.includes("account inactive")
  ) {
    return lang === "am"
      ? "ይህ መለያ ለጊዜው ታግዷል ወይም ተሰናክሏል። እባክዎ ድጋፍ ሰጪን ያነጋግሩ።"
      : "Your account is disabled. Please contact support.";
  }
  if (
    lower.includes("invalid or expired token") ||
    lower.includes("invalid refresh token") ||
    lower.includes("session expired") ||
    status === 401
  ) {
    return lang === "am"
      ? "የመግቢያ ክፍለ ጊዜዎ አልቋል። እባክዎ እንደገና ይግቡ።"
      : "Your session has expired. Please sign in again.";
  }
  if (
    lower.includes("insufficient permissions") ||
    lower.includes("forbidden") ||
    status === 403
  ) {
    return lang === "am"
      ? "ይህን እርምጃ ለመፈፀም የሚያስችል ፈቃድ የለዎትም።"
      : "You do not have permission to perform this action.";
  }

  // 4. Registration & Profile
  if (lower.includes("phone number already registered") || lower.includes("phone number is already registered")) {
    return lang === "am"
      ? "ይህ ስልክ ቁጥር ቀድሞ ተመዝግቧል። እባክዎ በዚሁ ስልክ ይግቡ ወይም ሌላ ስልክ ይጠቀሙ።"
      : "This phone number is already registered. Please sign in or use a different number.";
  }
  if (lower.includes("email already registered") || lower.includes("email is already registered")) {
    return lang === "am"
      ? "ይህ ኢሜይል ቀድሞ ተመዝግቧል። እባክዎ በዚሁ ኢሜይል ይግቡ ወይም ሌላ ኢሜይል ይጠቀሙ።"
      : "This email address is already registered. Please sign in or use a different email.";
  }
  if (lower.includes("phone number is required") || lower.includes("phone is required")) {
    return lang === "am"
      ? "ስልክ ቁጥር ማስገባት ግዴታ ነው።"
      : "Phone number is required.";
  }
  if (lower.includes("email or phone number is required")) {
    return lang === "am"
      ? "ስልክ ቁጥር ወይም ኢሜይል ማስገባት ያስፈልጋል።"
      : "Email or phone number is required.";
  }
  if (lower.includes("current password is incorrect")) {
    return lang === "am"
      ? "ያስገቡት የአሁኑ የይለፍ ቃል የተሳሳተ ነው።"
      : "The current password you entered is incorrect.";
  }
  if (lower.includes("passwords do not match")) {
    return lang === "am"
      ? "የይለፍ ቃሎች አይዛመዱም።"
      : "Passwords do not match.";
  }
  if (lower.includes("at least 8 characters")) {
    return lang === "am"
      ? "የይለፍ ቃል ቢያንስ 8 ቁምፊዎች መሆን አለበት።"
      : "Password must be at least 8 characters.";
  }
  if (lower.includes("user not found")) {
    return lang === "am"
      ? "ተጠቃሚው አልተገኘም።"
      : "User not found.";
  }

  // 5. Lotteries, Draw Numbers & Purchases
  if (lower.includes("lottery not found") || lower.includes("draw not found")) {
    return lang === "am"
      ? "የተጠየቀው ዕጣ አልተገኘም ወይም አይገኝም።"
      : "The requested draw was not found or is no longer available.";
  }
  if (lower.includes("ticket not found")) {
    return lang === "am"
      ? "የተጠየቀው ቲኬት አልተገኘም።"
      : "Ticket not found.";
  }
  if (lower.includes("not your ticket")) {
    return lang === "am"
      ? "ይህ የእርስዎ ቲኬት አይደለም።"
      : "You do not have permission for this ticket.";
  }
  if (lower.includes("not open for purchases") || lower.includes("sales are closed") || lower.includes("not open for ticket purchases")) {
    return lang === "am"
      ? "ለዚህ ዕጣ የቲኬት ሽያጭ ተዘግቷል።"
      : "Ticket sales are currently closed for this draw.";
  }
  if (lower.includes("not enough tickets remaining") || lower.includes("draw is now full") || lower.includes("lottery is now full")) {
    return lang === "am"
      ? "በቂ ቀሪ ቲኬቶች የሉም ወይም ዕጣው ሙሉ በሙሉ ተጠናቋል።"
      : "Not enough tickets remaining or this draw is sold out.";
  }
  if (lower.includes("duplicate draw numbers selected") || lower.includes("duplicate numbers")) {
    return lang === "am"
      ? "በአንድ ግዢ ውስጥ ተመሳሳይ ቁጥሮች ተመርጠዋል። እባክዎ የተለያዩ ቁጥሮችን ይምረጡ።"
      : "Duplicate numbers selected. Please select unique numbers.";
  }
  if (lower.includes("already taken or payment in progress") || lower.includes("ቀደም ብሎ ተወስዷል")) {
    const match = message.match(/:\s*([0-9,\s]+)$/);
    const nums = match ? match[1] : "";
    return lang === "am"
      ? `የተመረጡት ቁጥሮች ተወስደዋል ወይም በክፍያ ሂደት ላይ ናቸው${nums ? `: ${nums}` : ""}። እባክዎ ሌሎች ቁጥሮችን ይምረጡ።`
      : `Selected numbers are already taken or payment in progress${nums ? `: ${nums}` : ""}. Please choose other numbers.`;
  }
  if (lower.includes("selected numbers must be at least")) {
    const match = message.match(/(\d+)/);
    const minVal = match ? match[1] : "";
    return lang === "am"
      ? `የተመረጡት ቁጥሮች ቢያንስ ${minVal} መሆን አለባቸው።`
      : `Selected numbers must be at least ${minVal}.`;
  }
  if (lower.includes("selected numbers cannot exceed")) {
    const match = message.match(/(\d+)/);
    const maxVal = match ? match[1] : "";
    return lang === "am"
      ? `የተመረጡት ቁጥሮች ከ ${maxVal} መብለጥ የለባቸውም።`
      : `Selected numbers cannot exceed ${maxVal}.`;
  }
  if (lower.includes("payment reference has already been submitted") || lower.includes("የማጣቀሻ ቁጥር አስቀድሞ ተመዝግቧል")) {
    return lang === "am"
      ? "ይህ የክፍያ ማጣቀሻ ቁጥር ቀድሞ ገብቷል። እባክዎ ትክክለኛውን የክፍያ ደረሰኝ ያረጋግጡ።"
      : "This payment reference code has already been submitted. Please check your transaction details.";
  }
  if (lower.includes("payment screenshot proof is required") || lower.includes("payment screenshot receipt is required") || lower.includes("የክፍያ ማረጋገጫ ፎቶ")) {
    return lang === "am"
      ? "የክፍያ ማረጋገጫ ደረሰኝ ስክሪንሾት (ፎቶ) ማስገባት ግዴታ ነው።"
      : "Payment screenshot receipt is required. Please upload your receipt photo.";
  }
  if (lower.includes("screenshot file is empty") || lower.includes("ፎቶ ባዶ ነው")) {
    return lang === "am"
      ? "የተጫነው የስክሪንሾት ፋይል ባዶ ነው። እባክዎ ትክክለኛውን ፎቶ እንደገና ይስቀሉ።"
      : "The uploaded screenshot file is empty. Please select a valid receipt photo.";
  }
  if (
    lower.includes("failed to upload payment screenshot") ||
    lower.includes("failed to save screenshot") ||
    lower.includes("የስክሪንሾት ምስል ማስቀመጥ አልተቻለም")
  ) {
    return lang === "am"
      ? "የክፍያ ማረጋገጫውን ምስል መስቀል አልተቻለም። እባክዎ እንደገና ይሞክሩ።"
      : "Failed to upload payment screenshot proof. Please try again.";
  }
  if (lower.includes("sender name is required") || lower.includes("የላኪ ስም")) {
    return lang === "am"
      ? "የላኪ ስም ማስገባት ግዴታ ነው።"
      : "Sender name is required.";
  }
  if (lower.includes("account number and name are required") || lower.includes("የሂሳብ ቁጥር እና ስም")) {
    return lang === "am"
      ? "የሂሳብ ቁጥር እና ስም ማስገባት ግዴታ ነው።"
      : "Account number and name are required.";
  }

  // 6. Admin & Draw Management
  if (lower.includes("only draft lotteries can be deleted") || lower.includes("only draft draws can be deleted")) {
    return lang === "am"
      ? "ረቂቅ (Draft) የሆኑ ዕጣዎችን ብቻ መሰረዝ ይቻላል።"
      : "Only draft draws can be deleted.";
  }
  if (lower.includes("only draft lotteries can be published") || lower.includes("only draft draws can be published")) {
    return lang === "am"
      ? "ረቂቅ (Draft) የሆኑ ዕጣዎችን ብቻ ማሳተም ይቻላል።"
      : "Only draft draws can be published.";
  }
  if (lower.includes("only active lotteries can be closed") || lower.includes("only active draws can be closed")) {
    return lang === "am"
      ? "ንቁ የሆኑ ዕጣዎችን ብቻ መዝጋት ይቻላል።"
      : "Only active draws can be closed.";
  }
  if (lower.includes("cannot cancel a drawn lottery") || lower.includes("cannot cancel an already drawn")) {
    return lang === "am"
      ? "ዕጣ የወጣበትን ውድድር መሰረዝ አይቻልም።"
      : "Cannot cancel a draw that has already been drawn.";
  }
  if (lower.includes("results already published")) {
    return lang === "am"
      ? "ለዚህ ዕጣ ውጤቶች ቀድመው ታትመዋል።"
      : "Results have already been published for this draw.";
  }
  if (lower.includes("publish results first before uploading")) {
    return lang === "am"
      ? "ቪዲዮ ከመስቀልዎ በፊት መጀመሪያ የዕጣ ውጤቶችን ያሳትሙ።"
      : "Please publish winning numbers first before uploading the proof video.";
  }
  if (lower.includes("results not yet published")) {
    return lang === "am"
      ? "የዚህ ዕጣ ውጤቶች እስካሁን አልታተሙም።"
      : "The results for this draw have not been published yet.";
  }
  if (lower.includes("transaction not found")) {
    return lang === "am"
      ? "የክፍያ መረጃው አልተገኘም።"
      : "Payment transaction not found.";
  }
  if (lower.includes("already confirmed")) {
    return lang === "am"
      ? "ይህ ክፍያ ቀድሞ ተረጋግጧል።"
      : "This payment is already confirmed.";
  }
  if (lower.includes("only pending payments can be rejected")) {
    return lang === "am"
      ? "በሂደት ላይ ያሉ ክፍያዎችን ብቻ ውድቅ ማድረግ ይቻላል።"
      : "Only pending payments can be rejected.";
  }

  // 7. HTTP status fallbacks
  if (status === 404) {
    return lang === "am" ? "የተጠየቀው መረጃ አልተገኘም።" : "The requested item was not found.";
  }
  if (status === 500) {
    return lang === "am"
      ? "የአገልጋይ ስህተት አጋጥሟል። እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ።"
      : "A server error occurred. Please try again in a moment.";
  }

  // Return message if clean or general fallback
  return message || (lang === "am" ? "ስህተት አጋጥሟል። እባክዎ እንደገና ይሞክሩ።" : "An error occurred. Please try again.");
}
