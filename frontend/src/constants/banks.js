// ── Ethiopian Banks & Digital Wallets ───────────────────────────────────────
// Alphabetical order for Ethiopian banks and digital wallet options.

export const DIGITAL_WALLETS = [
  {
    id: "TELEBIRR",
    name: "Telebirr",
    nameAm: "ቴሌብር",
    icon: "📱",
    ussd: "*127#",
    descEn: "Pay via Telebirr SuperApp or USSD *127#",
    descAm: "በቴሌብር መተግበሪያ ወይም በ *127# ይክፈሉ",
    accountKey: "telebirr_number",
    nameKey: "telebirr_name",
  },
  {
    id: "MPESA",
    name: "M-Pesa (Safaricom)",
    nameAm: "ኤም-ፔሳ (ሳፋሪኮም)",
    icon: "🟢",
    ussd: "*733#",
    descEn: "Pay via M-Pesa App or USSD *733#",
    descAm: "በኤም-ፔሳ መተግበሪያ ወይም በ *733# ይክፈሉ",
    accountKey: "mpesa_number",
    nameKey: "mpesa_name",
  },
];

export const ETHIOPIAN_BANKS = [
  { id: "ABAY",    name: "Abay Bank",                     nameAm: "አባይ ባንክ",                 short: "Abay" },
  { id: "ADDIS",   name: "Addis International Bank",      nameAm: "አዲስ ኢንተርናሽናል ባንክ",    short: "Addis" },
  { id: "AHADU",   name: "Ahadu Bank",                    nameAm: "አሐዱ ባንክ",                 short: "Ahadu" },
  { id: "AMHARA",  name: "Amhara Bank",                   nameAm: "አማራ ባንክ",                 short: "Amhara" },
  { id: "AWASH",   name: "Awash Bank",                    nameAm: "አዋሽ ባንክ",                 short: "Awash", accountKey: "awash_number", nameKey: "awash_name" },
  { id: "BOA",     name: "Bank of Abyssinia",             nameAm: "አቢሲኒያ ባንክ",               short: "Abyssinia" },
  { id: "BERHAN",  name: "Berhan Bank",                   nameAm: "ብርሃን ባንክ",                short: "Berhan" },
  { id: "CBE",     name: "Commercial Bank of Ethiopia (CBE)", nameAm: "የኢትዮጵያ ንግድ ባንክ (CBE)", short: "CBE", accountKey: "cbe_number", nameKey: "cbe_name" },
  { id: "CBO",     name: "Cooperative Bank of Oromia (CBO)",  nameAm: "የኦሮሚያ ኅብረት ሥራ ባንክ",  short: "CBO" },
  { id: "DASHEN",  name: "Dashen Bank",                   nameAm: "ዳሸን ባንክ",                 short: "Dashen" },
  { id: "ENAT",    name: "Enat Bank",                     nameAm: "እናት ባንክ",                 short: "Enat" },
  { id: "HIBRET",  name: "Hibret Bank",                   nameAm: "ኅብረት ባንክ",                short: "Hibret" },
  { id: "HIJRA",   name: "Hijra Bank",                    nameAm: "ሂጅራ ባንክ",                 short: "Hijra" },
  { id: "LION",    name: "Lion International Bank",       nameAm: "አንበሳ ኢንተርናሽናል ባንክ",   short: "Lion" },
  { id: "NIB",     name: "Nib International Bank",        nameAm: "ንብ ኢንተርናሽናል ባንክ",      short: "Nib" },
  { id: "SIINQEE", name: "Siinqee Bank",                  nameAm: "ሲንቄ ባንክ",                 short: "Siinqee" },
  { id: "TSEDEY",  name: "Tsedey Bank",                   nameAm: "ፀደይ ባንክ",                 short: "Tsedey" },
  { id: "TSEHAY",  name: "Tsehay Bank",                   nameAm: "ፀሐይ ባንክ",                 short: "Tsehay" },
  { id: "WEGAGEN", name: "Wegagen Bank",                  nameAm: "ወጋገን ባንክ",                short: "Wegagen" },
  { id: "ZAMZAM",  name: "ZamZam Bank",                   nameAm: "ዘምዘም ባንክ",                short: "ZamZam" },
  { id: "ZEMEN",   name: "Zemen Bank",                    nameAm: "ዘመን ባንክ",                 short: "Zemen" },
];
