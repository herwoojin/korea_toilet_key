"use client";

import { Activity, Map, PenLine, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default function TabBar() {
  const t = useTranslations("tabs");
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: t("map"), icon: Map },
    { href: "/live", label: t("live"), icon: Activity },
    { href: "/report", label: t("report"), icon: PenLine },
    { href: "/my", label: t("my"), icon: User },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[1100] flex h-16 border-t bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs",
              active ? "font-semibold text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
