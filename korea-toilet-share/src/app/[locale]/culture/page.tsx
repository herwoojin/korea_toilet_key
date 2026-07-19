import { getTranslations } from "next-intl/server";

/** 외국인 온보딩 — 한국 화장실 비밀번호 문화 안내 (FR-20, T-502) */
export default async function CulturePage() {
  const t = await getTranslations("culture");

  const sections = [
    { title: t("s1t"), body: t("s1b") },
    { title: t("s2t"), body: t("s2b") },
    { title: t("s3t"), body: t("s3b") },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-5 p-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("intro")}</p>
      {sections.map((s) => (
        <section key={s.title} className="rounded-lg border p-4">
          <h2 className="mb-1.5 font-semibold">{s.title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}
    </div>
  );
}
