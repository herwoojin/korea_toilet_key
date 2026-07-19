import { getTranslations } from "next-intl/server";

/** 오너 대시보드 자리 — Phase 4 (T-403~404)에서 구현 */
export default async function OwnerPage() {
  const t = await getTranslations("owner");
  return (
    <div className="mx-auto max-w-lg space-y-3 p-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="rounded-lg border p-4 text-sm leading-relaxed text-muted-foreground">
        {t("comingSoon")}
      </p>
    </div>
  );
}
