"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { isFirebaseConfigured } from "@/lib/firebase/client";

interface Stats {
  today: number;
  total: number;
}

const dayKey = () => `ktk-visited:${new Date().toISOString().slice(0, 10)}`;

/**
 * 지도 우측 하단 방문자 배지 — 오늘/누적 방문자 (구글시트 stats 탭).
 * 하루에 기기당 1회만 카운트하고, 이후에는 조회만 한다.
 */
export default function VisitorBadge() {
  const t = useTranslations("map");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let count = false;
    try {
      if (!localStorage.getItem(dayKey())) {
        localStorage.setItem(dayKey(), "1");
        count = true;
      }
    } catch {
      /* ignore */
    }
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Stats | null) => {
        if (d) setStats(d);
      })
      .catch(() => undefined);
  }, []);

  if (!stats) return null;

  return (
    <div className="pointer-events-none absolute bottom-20 right-3 z-[1001] flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow backdrop-blur">
      <Users className="h-3.5 w-3.5" aria-hidden />
      <span>
        {t("visitorsToday")} <b className="text-foreground">{stats.today}</b>
        {" · "}
        {t("visitorsTotal")} <b className="text-foreground">{stats.total}</b>
      </span>
    </div>
  );
}
