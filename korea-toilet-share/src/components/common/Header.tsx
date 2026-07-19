"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { Info, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { getClientAuth } from "@/lib/firebase/client";
import LanguageSwitcher from "./LanguageSwitcher";
import LoginSheet from "./LoginSheet";

export default function Header() {
  const t = useTranslations("header");
  const tApp = useTranslations("app");
  const { user, profile } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-[1100] flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
      <Link href="/" className="flex min-w-0 items-center gap-2">
        {/* 로고: 지도 핀 + 남녀 픽토그램 + 열린 자물쇠 */}
        <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
          <path d="M32 2C18.7 2 8 12.7 8 26c0 17 24 36 24 36s24-19 24-36C56 12.7 45.3 2 32 2z" fill="#2563EB" />
          <circle cx="24" cy="15" r="3.2" fill="#fff" />
          <rect x="20.9" y="19.3" width="6.2" height="8.6" rx="2" fill="#fff" />
          <rect x="21.7" y="27.9" width="2.1" height="6.6" fill="#fff" />
          <rect x="24.3" y="27.9" width="2.1" height="6.6" fill="#fff" />
          <circle cx="40" cy="15" r="3.2" fill="#fff" />
          <path d="M40 19l-4.4 9.6h8.8z" fill="#fff" />
          <rect x="38" y="28.6" width="1.8" height="6" fill="#fff" />
          <rect x="40.2" y="28.6" width="1.8" height="6" fill="#fff" />
          <rect x="27.6" y="41.5" width="8.8" height="7.2" rx="1.6" fill="#fff" />
          <path d="M29.6 41.5v-3a2.5 2.5 0 0 1 5-.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="truncate text-sm font-bold leading-tight">
          {tApp("shortName")}
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={t("culture")}>
          <Link href="/culture">
            <Info className="h-4 w-4" />
          </Link>
        </Button>
        <LanguageSwitcher />
        {user ? (
          <div className="flex items-center gap-1">
            <span className="max-w-[72px] truncate text-xs text-muted-foreground">
              {profile?.nickname ?? user.displayName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={t("logout")}
              onClick={() => signOut(getClientAuth())}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button size="sm" className="h-8" onClick={() => setLoginOpen(true)}>
            {t("login")}
          </Button>
        )}
      </div>
      <LoginSheet open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}
