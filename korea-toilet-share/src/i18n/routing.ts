import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const locales = ["ko", "en", "zh", "ja"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ko",
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
