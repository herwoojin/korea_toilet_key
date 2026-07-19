"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Level = "ok" | "warn" | "danger" | "critical" | "offline";

interface Health {
  ok: boolean;
  uptimeSec: number;
  memory: { usedMB: number; totalMB: number; percent: number } | null;
  cpuLoad1m: number | null;
  disk: { percent: number } | null;
  level: Exclude<Level, "offline">;
  reason: string;
}

const COLORS: Record<Level, string> = {
  ok: "#43a047",
  warn: "#fbc02d",
  danger: "#f57c00",
  critical: "#e53935",
  offline: "#9e9e9e",
};

/** 백엔드 서버 용량 신호등 — 우측 하단 고정 배터리 인디케이터 */
export default function ServerBattery() {
  const t = useTranslations("battery");
  const [health, setHealth] = useState<Health | null>(null);
  const [level, setLevel] = useState<Level>("ok");
  const [open, setOpen] = useState(false);
  const fails = useRef(0);

  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch("/api/server-health", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data: Health = await res.json();
      fails.current = 0;
      setHealth(data);
      setLevel(data.level);
    } catch {
      fails.current += 1;
      if (fails.current >= 3) setLevel("offline");
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [poll]);

  const memPct = health?.memory?.percent ?? 0;
  const diskPct = health?.disk?.percent ?? 0;
  // 배터리 채움 = 여유 용량
  const freePct =
    level === "offline" ? 0 : Math.max(0, Math.min(100, 100 - Math.max(memPct, diskPct)));
  const color = COLORS[level];
  const anim =
    level === "critical"
      ? "sb-critical"
      : level === "danger"
        ? "sb-danger"
        : level === "warn"
          ? "sb-warn"
          : "";

  return (
    <div
      className="fixed z-[1200]"
      style={{ right: 12, bottom: "calc(72px + env(safe-area-inset-bottom))" }}
    >
      {open && (
        <div className="absolute bottom-8 right-0 w-44 rounded-lg border bg-background p-3 text-xs shadow-lg">
          <p className="mb-1.5 font-semibold">{t("title")}</p>
          {level === "offline" || !health ? (
            <>
              <p className="text-muted-foreground">{t("offline")}</p>
              <button
                className="mt-2 rounded bg-secondary px-2 py-1"
                onClick={() => {
                  fails.current = 0;
                  poll();
                }}
              >
                {t("retry")}
              </button>
            </>
          ) : (
            <dl className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <dt>{t("memory")}</dt>
                <dd>
                  {health.memory
                    ? `${health.memory.usedMB}/${health.memory.totalMB}MB (${health.memory.percent}%)`
                    : "–"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>{t("cpu")}</dt>
                <dd>{health.cpuLoad1m ?? "–"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t("uptime")}</dt>
                <dd>{Math.floor(health.uptimeSec / 60)}m</dd>
              </div>
            </dl>
          )}
        </div>
      )}
      <button
        aria-label={t("title")}
        className={anim}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="36" height="18" viewBox="0 0 36 18">
          <rect x="1" y="2" width="30" height="14" rx="3" fill="none" stroke={color} strokeWidth="2" />
          <rect x="32.5" y="6" width="3" height="6" rx="1" fill={color} />
          {level === "offline" ? (
            <text x="16" y="13" textAnchor="middle" fontSize="11" fontWeight="bold" fill={color}>
              !
            </text>
          ) : (
            <rect x="3.5" y="4.5" width={25 * (freePct / 100)} height="9" rx="1.5" fill={color} />
          )}
        </svg>
      </button>
    </div>
  );
}
