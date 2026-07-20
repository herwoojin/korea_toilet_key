"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Trophy } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AuroraBackground } from "@/components/ui/digital-aurora";
import { Input } from "@/components/ui/input";
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

/** 핀이 받은 포인트: 맞아요 ×10 + 열람 ×1 */
function pinPoints(b: Building): number {
  const correct =
    (b.toilets?.male?.correctCount ?? 0) + (b.toilets?.female?.correctCount ?? 0);
  return correct * 10 + (b.views ?? 0);
}

const POLL_MS = 30_000;

type SortKey = "building" | "gender" | "time" | "user";
type SortDir = "asc" | "desc";

/**
 * 실시간 등록 현황 — 구글시트의 핀 목록을 30초마다 폴링해 표시.
 * 컬럼 정렬(클릭 토글)·컬럼별 검색 필터 + 하단 등록자 포인트 랭킹.
 */
export default function LivePage() {
  const t = useTranslations("live");
  const tApp = useTranslations("app");
  const tBuilding = useTranslations("building");
  const format = useFormatter();

  const [pins, setPins] = useState<Building[]>([]);
  const [demoRows, setDemoRows] = useState<LiveRow[]>([]);
  const [syncing, setSyncing] = useState(isFirebaseConfigured);
  const knownIds = useRef<Set<string> | null>(null);
  const newIds = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);

  // 정렬·필터 상태
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [fBuilding, setFBuilding] = useState("");
  const [fUser, setFUser] = useState("");
  const [fGender, setFGender] = useState<"all" | Gender>("all");

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
          newIds.current = new Set(
            first ? [] : data.buildings.filter((b) => !prev.has(b.id)).map((b) => b.id)
          );
          knownIds.current = new Set(data.buildings.map((b) => b.id));
          setPins(data.buildings);
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
    setDemoRows(
      Array.from({ length: 6 }, (_, i) =>
        makeDemoRow(Date.now() - (i + 1) * 90_000, false)
      )
    );
    const id = setInterval(() => {
      setDemoRows((prev) =>
        [makeDemoRow(Date.now(), true), ...prev.map((r) => ({ ...r, isNew: false }))].slice(0, 30)
      );
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  // 정렬 토글 — 같은 컬럼 클릭 시 오름/내림 전환
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "time" ? "desc" : "asc");
    }
  }

  // 필터 + 정렬 적용된 행
  const rows = useMemo(() => {
    const base = isFirebaseConfigured
      ? pins.map((b) => pinToRow(b, newIds.current.has(b.id)))
      : demoRows;
    const filtered = base.filter((r) => {
      if (fBuilding && !r.buildingName.toLowerCase().includes(fBuilding.toLowerCase()))
        return false;
      if (fUser && !r.nickname.toLowerCase().includes(fUser.toLowerCase())) return false;
      if (fGender !== "all" && !r.genders.includes(fGender)) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "building":
          return a.buildingName.localeCompare(b.buildingName) * dir;
        case "gender":
          return a.genders.join().localeCompare(b.genders.join()) * dir;
        case "user":
          return a.nickname.localeCompare(b.nickname) * dir;
        case "time":
        default:
          return (a.atMs - b.atMs) * dir;
      }
    });
  }, [pins, demoRows, fBuilding, fUser, fGender, sortKey, sortDir]);

  // 등록자 포인트 랭킹 (맞아요 ×10 + 열람 ×1, 내림차순)
  const ranking = useMemo(() => {
    const byUser = new Map<string, number>();
    for (const b of pins) {
      const name = b.createdByNickname ?? "user";
      byUser.set(name, (byUser.get(name) ?? 0) + pinPoints(b));
    }
    return [...byUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [pins]);

  function SortHeader({
    label,
    k,
    className,
  }: {
    label: string;
    k: SortKey;
    className?: string;
  }) {
    const active = sortKey === k;
    return (
      <th className={cn("px-3 py-2 font-medium", className)}>
        <button
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground",
            active && "text-primary"
          )}
          onClick={() => toggleSort(k)}
        >
          {label}
          {active &&
            (sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            ))}
        </button>
      </th>
    );
  }

  const filterInputCls = "h-8 rounded border-muted bg-background px-2 text-xs";

  return (
    <div className="relative min-h-full">
      {/* 오로라 배경 — 콘텐츠 뒤 전체 화면 */}
      <AuroraBackground className="fixed inset-0" />
      <div className="relative mx-auto max-w-lg space-y-3 p-4">
      <SyncOverlay show={syncing} text={tApp("syncing")} />
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
        </span>
        <span className="text-xs font-bold text-red-400">{t("live")}</span>
        <h1 className="text-xl font-bold text-white drop-shadow">{t("title")}</h1>
      </div>
      <p className="text-xs leading-relaxed text-white/75">{t("desc")}</p>
      {!isFirebaseConfigured && (
        <p className="rounded-md bg-blue-50/90 px-3 py-2 text-xs text-blue-800 backdrop-blur">
          {tApp("demoBanner")}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/20 bg-background/95 shadow-xl backdrop-blur">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <SortHeader label={t("colBuilding")} k="building" className="text-left" />
              <SortHeader label={t("colToilet")} k="gender" className="text-left" />
              <SortHeader label={t("colTime")} k="time" className="text-right" />
              <SortHeader label={t("colUser")} k="user" className="text-right" />
            </tr>
            {/* 컬럼별 검색 필터 */}
            <tr className="border-t">
              <th className="px-2 pb-2 pt-1">
                <Input
                  className={filterInputCls}
                  placeholder={t("filterBuilding")}
                  value={fBuilding}
                  onChange={(e) => setFBuilding(e.target.value)}
                />
              </th>
              <th className="px-2 pb-2 pt-1">
                <select
                  className={cn(filterInputCls, "w-full border")}
                  value={fGender}
                  onChange={(e) => setFGender(e.target.value as "all" | Gender)}
                >
                  <option value="all">{t("filterAll")}</option>
                  <option value="male">{tBuilding("male")}</option>
                  <option value="female">{tBuilding("female")}</option>
                </select>
              </th>
              <th className="px-2 pb-2 pt-1" />
              <th className="px-2 pb-2 pt-1">
                <Input
                  className={filterInputCls}
                  placeholder={t("filterUser")}
                  value={fUser}
                  onChange={(e) => setFUser(e.target.value)}
                />
              </th>
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
                  <td className="max-w-[130px] truncate px-3 py-2 font-medium">
                    {r.buildingName}
                  </td>
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
                  <td className="max-w-[90px] truncate px-3 py-2 text-right text-xs">
                    {r.nickname}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 등록자 포인트 랭킹 */}
      {isFirebaseConfigured && ranking.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/20 bg-background/95 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 px-4 py-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <p className="font-semibold">{t("rankTitle")}</p>
            <p className="ml-auto text-[11px] text-muted-foreground">{t("rankDesc")}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="w-14 px-3 py-2 text-left font-medium">{t("colRank")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("colUser")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("colPoints")}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map(([name, pts], i) => (
                <tr key={name} className="border-t">
                  <td className="px-3 py-2 font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 font-medium">{name}</td>
                  <td className="px-3 py-2 text-right font-bold text-primary">{pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
