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
      description:
        lang === "am"
          ? "የዮና ኦንላይን እጣ መድረክ መስራች እና ዋና አዘጋጅ። እያንዳንዱ የዕጣ ውድድር በከፍተኛ ታማኝነት፣ ፍትሃዊነት እና ግልጽነት እንዲካሄድ በቀጥታ ይመራል።"
          : "Founder and Lead Organizer of Yona Online Draw Platform. Dedicated to ensuring every draw is held with maximum fairness, integrity, and transparency.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-cream-50 tracking-tight mb-4">
          {t("organizersTitle")}
        </h1>
        <p className="text-sm sm:text-base text-cream-300 leading-relaxed">
          {t("organizersSub")}
        </p>
      </div>

      {/* Organizers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {organizers.map((org) => (
          <div
            key={org.id}
            className="card p-6 sm:p-8 flex flex-col items-center text-center border-ink-600 hover:border-green-500/50 transition-all duration-300 shadow-xl bg-ink-800/70 hover:shadow-green-500/5 group"
          >
            {/* Organizer Photo */}
            <div className="mb-6">
              <div className="h-48 w-48 sm:h-56 sm:w-56 rounded-2xl overflow-hidden border-2 border-green-500/40 bg-ink-900 shadow-lg group-hover:border-green-400 group-hover:scale-[1.02] transition duration-300">
                <img
                  src={org.image}
                  alt={org.name}
                  className="h-full w-full object-cover object-top"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/Logo.png";
                  }}
                />
              </div>
            </div>

            {/* Name & Title */}
            <h2 className="text-2xl font-bold text-cream-50 mb-1">
              {org.name}
            </h2>
            {lang === "am" && (
              <div className="text-base font-bold text-cream-200 mb-1">
                {org.amharicName}
              </div>
            )}
            <div className="text-sm font-semibold text-green-300 font-mono mb-1">
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
    </div>
  );
}
