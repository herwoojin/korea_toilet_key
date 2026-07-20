"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import SyncOverlay from "@/components/common/SyncOverlay";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { MOCK_BUILDINGS } from "@/lib/mock/buildings";
import { cn } from "@/lib/utils";
import { toMillis, type Building, type Gender } from "@/types/building";

interface LiveRow {
  id: string;
  buildingName: string;
  nickname: string;
  genders: Gender[];
  atMs: number;
  isNew: boolean;
}

const DEMO_NAMES = [
  "급한토끼",
  "서울워커",
  "Tourist_Amy",
  "旅人ケン",
  "小笼包",
  "MintLatte",
  "제보왕",
  "BusyBee",
];

let demoSeq = 0;
function makeDemoRow(ms: number, isNew: boolean): LiveRow {
  const b = MOCK_BUILDINGS[Math.floor(Math.random() * MOCK_BUILDINGS.length)];
  return {
    id: `demo-${ms}-${demoSeq++}`,
    buildingName: b.name,
    nickname: DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)],
    genders: [Math.random() < 0.5 ? "male" : "female"],
    atMs: ms,
    isNew,
  };
}

function pinToRow(b: Building, isNew: boolean): LiveRow {
  const genders: Gender[] = [];
  if (b.toilets?.male?.exists) genders.push("male");
  if (b.toilets?.female?.exists) genders.push("female");
  return {
    id: b.id,
    buildingName: b.name,
    nickname: b.createdByNickname ?? "user",
    genders,
    atMs: toMillis(b.createdAt) ?? 0,
    isNew,
  };
}

const POLL_MS = 30_000;

/**
 * 실시간 등록 현황 — 구글시트의 핀 목록을 30초마다 폴링해 최근 등록 순으로 표시.
 * 새로 나타난 핀은 애니메이션과 함께 맨 위에 추가된다.
 * Firebase env 미설정 시 5초마다 가상 등록이 흐르는 데모 피드로 동작.
 */
export default function LivePage() {
  const t = useTranslations("live");
  const tApp = useTranslations("app");
  const tBuilding = useTranslations("building");
  const format = useFormatter();

  const [rows, setRows] = useState<LiveRow[]>([]);
  // 첫 시트 연동이 끝날 때까지 "서버 연동 중" 팝업 표시
  const [syncing, setSyncing] = useState(isFirebaseConfigured);
  const knownIds = useRef<Set<string> | null>(null);
  const [, setTick] = useState(0);

  // 상대시각("n분 전") 주기 갱신
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured) {
      let cancelled = false;
      const load = async () => {
        try {
          const res = await fetch("/api/pins", { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as { buildings?: Building[] };
          if (cancelled || !data.buildings) return;
          const first = knownIds.current == null;
          const prev = knownIds.current ?? new Set<string>();
          const sorted = [...data.buildings].sort(
            (a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0)
          );
          setRows(sorted.slice(0, 30).map((b) => pinToRow(b, !first && !prev.has(b.id))));
          knownIds.current = new Set(sorted.map((b) => b.id));
        } catch {
          /* 다음 폴링에서 재시도 */
        } finally {
          if (!cancelled) setSyncing(false);
        }
      };
      load();
      const id = setInterval(load, POLL_MS);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }

    // 데모 모드: 가상 실시간 피드
    setRows(
      Array.from({ length: 6 }, (_, i) =>
        makeDemoRow(Date.now() - (i + 1) * 90_000, false)
      )
    );
    const id = setInterval(() => {
      setRows((prev) =>
        [makeDemoRow(Date.now(), true), ...prev.map((r) => ({ ...r, isNew: false }))].slice(0, 30)
      );
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-3 p-4">
      <SyncOverlay show={syncing} text={tApp("syncing")} />
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="text-xs font-bold text-red-500">{t("live")}</span>
        <h1 className="text-xl font-bold">{t("title")}</h1>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("desc")}</p>
      {!isFirebaseConfigured && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
          {tApp("demoBanner")}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("colUser")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("colBuilding")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("colToilet")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("colTime")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={cn("border-t", r.isNew && "live-row-new")}>
                  <td className="max-w-[90px] truncate px-3 py-2 font-medium">
                    {r.nickname}
                  </td>
                  <td className="max-w-[130px] truncate px-3 py-2">{r.buildingName}</td>
                  <td className="space-x-1 px-3 py-2">
                    {r.genders.map((g) => (
                      <Badge key={g} variant="secondary">
                        {tBuilding(g)}
                      </Badge>
                    ))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-muted-foreground">
                    {r.atMs ? format.relativeTime(new Date(r.atMs)) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
