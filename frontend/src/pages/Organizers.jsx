import { Link } from "react-router-dom";
import { useLang } from "../context/LangContext";

export default function Organizers() {
  const { t, lang } = useLang();

  const organizers = [
    {
      id: "admin1",
      name: "Yonas Teklu",
      amharicName: "ዮናስ ተክሉ",
      role: t("organizerRole1"),
      image: "/admin1.png",
      badge: t("verifiedOrganizer"),
      description:
        lang === "am"
          ? "የዮና ኦንላይን እጣ መድረክ መስራች እና ዋና አዘጋጅ። እያንዳንዱ የዕጣ ውድድር በከፍተኛ ታማኝነት፣ ፍትሃዊነት እና ግልጽነት እንዲካሄድ በቀጥታ ይመራል።"
          : "Founder and Lead Organizer of Yona Online Draw Platform. Dedicated to ensuring every draw is held with maximum fairness, integrity, and transparency.",
    },
    {
      id: "admin2",
      name: "Robel Tesfaye",
      amharicName: "ሮቤል ተስፋዬ",
      role: t("organizerRole2"),
      image: "/admin2.png",
      badge: t("verifiedOrganizer"),
      description:
        lang === "am"
          ? "ተባባሪ አዘጋጅ እና የስራ ማስኬጃ ኃላፊ። የክፍያ ማረጋገጫዎችን፣ የተጠቃሚዎችን ድጋፍ እና የቀጥታ የዕጣ ውጤቶች ቪዲዮ ማስረጃዎችን በበላይነት ያስተባብራል።"
          : "Co-Organizer and Operations Lead. Coordinates participant support, payment verification, and transparent video evidence for all draw results.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-300 border border-green-500/30 mb-4 shadow-sm">
          <span>🛡️</span>
          <span>{lang === "am" ? "ህጋዊ እና የተረጋገጡ አዘጋጆች" : "Official & Verified Organizers"}</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-cream-50 tracking-tight mb-4">
          {t("organizersTitle")}
        </h1>
        <p className="text-sm sm:text-base text-cream-300 leading-relaxed">
          {t("organizersSub")}
        </p>
      </div>

      {/* Organizers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
        {organizers.map((org) => (
          <div
            key={org.id}
            className="card p-6 sm:p-8 flex flex-col items-center text-center border-ink-600 hover:border-green-500/50 transition-all duration-300 shadow-xl bg-ink-800/70 hover:shadow-green-500/5 group"
          >
            {/* Organizer Photo */}
            <div className="relative mb-6">
              <div className="h-44 w-44 sm:h-52 sm:w-52 rounded-2xl overflow-hidden border-2 border-green-500/40 bg-ink-900 shadow-lg group-hover:border-green-400 group-hover:scale-[1.02] transition duration-300">
                <img
                  src={org.image}
                  alt={org.name}
                  className="h-full w-full object-cover object-top"
                  onError={(e) => {
                    // graceful fallback if image is missing
                    e.target.onerror = null;
                    e.target.src = "/Logo.png";
                  }}
                />
              </div>
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-green-600 text-ink-950 shadow-md">
                <span>✓</span>
                <span>{org.badge}</span>
              </span>
            </div>

            {/* Name & Title */}
            <h2 className="text-2xl font-bold text-cream-50 mt-2 mb-1">
              {org.name}
            </h2>
            {lang === "am" && (
              <div className="text-base font-bold text-cream-200 mb-1">
                {org.amharicName}
              </div>
            )}
            <div className="text-xs sm:text-sm font-semibold text-green-300 font-mono mb-1">
              {org.role}
            </div>
            <div className="text-xs text-cream-400 font-medium mb-4">
              {lang === "am" ? "የዮና ኦንላይን እጣ መድረክ" : "Yona Online Draw Platform"}
            </div>

            {/* Description / Bio */}
            <p className="text-xs sm:text-sm text-cream-300 leading-relaxed border-t border-ink-700/70 pt-4">
              {org.description}
            </p>
          </div>
        ))}
      </div>

      {/* Trust & Transparency Banner */}
      <div className="card p-6 sm:p-8 border-green-500/30 bg-gradient-to-br from-ink-800 to-green-950/20 text-center max-w-3xl mx-auto">
        <h3 className="text-lg sm:text-xl font-bold text-cream-50 mb-2 flex items-center justify-center gap-2">
          <span>✨</span>
          <span>{t("organizersTrustTitle")}</span>
        </h3>
        <p className="text-xs sm:text-sm text-cream-300 mb-6 max-w-xl mx-auto leading-relaxed">
          {t("organizersTrustDesc")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mb-6">
          <div className="p-3.5 rounded-xl bg-ink-900/80 border border-ink-700">
            <div className="text-lg mb-1">🎯</div>
            <div className="text-xs font-bold text-cream-100">
              {lang === "am" ? "የቁጥር ብቸኝነት" : "Exclusive Numbers"}
            </div>
            <div className="text-[11px] text-cream-400 mt-0.5">
              {lang === "am"
                ? "አንድ የዕጣ ቁጥር ለአንድ ተሳታፊ ብቻ ይሰጣል።"
                : "One draw number is reserved for one person only."}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-ink-900/80 border border-ink-700">
            <div className="text-lg mb-1">📹</div>
            <div className="text-xs font-bold text-cream-100">
              {lang === "am" ? "የቪዲዮ ማስረጃ" : "Video Proof"}
            </div>
            <div className="text-[11px] text-cream-400 mt-0.5">
              {lang === "am"
                ? "የእጣው አወጣጥ በግልጽ ቪዲዮ እና ፎቶ ይረጋገጣል።"
                : "Full draw video recordings published with results."}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-ink-900/80 border border-ink-700">
            <div className="text-lg mb-1">🏦</div>
            <div className="text-xs font-bold text-cream-100">
              {lang === "am" ? "ቀጥታ ክፍያ" : "Secure Payment"}
            </div>
            <div className="text-[11px] text-cream-400 mt-0.5">
              {lang === "am"
                ? "በቴሌብር እና በኢትዮጵያ ባንኮች ቀጥታ ይፈጸማል።"
                : "Direct verified transfers via Telebirr & Banks."}
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold shadow-glow"
        >
          <span>{lang === "am" ? "ንቁ እጣዎችን ይመልከቱ" : "Browse Active Draws"}</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
