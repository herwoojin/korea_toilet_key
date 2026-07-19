"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

const LANGS: { code: "ko" | "en" | "zh" | "ja"; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      aria-label="Language"
      className="h-8 rounded-md border border-input bg-background px-1.5 text-xs focus:outline-none"
      value={locale}
      onChange={(e) => {
        const next = e.target.value as (typeof LANGS)[number]["code"];
        try {
          localStorage.setItem("locale", next);
        } catch {
          /* ignore */
        }
        router.replace(pathname, { locale: next });
      }}
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
