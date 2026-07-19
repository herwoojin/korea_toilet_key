"use client";

import { useEffect, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { MOCK_BUILDINGS } from "@/lib/mock/buildings";
import { cn } from "@/lib/utils";
import { toMillis, type Gender } from "@/types/building";

interface LiveRow {
  id: string;
  buildingName: string;
  gender: Gender;
  viewerNickname: string;
  viewedAtMs: number;
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
    gender: Math.random() < 0.5 ? "male" : "female",
    viewerNickname: DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)],
    viewedAtMs: ms,
    isNew,
  };
}

/**
 * 모두가 공유하는 실시간 열람 현황 (liveFeed 컬렉션 onSnapshot 구독)
 * 새 열람이 발생하면 표 맨 위에 애니메이션과 함께 실시간 추가된다.
 * Firebase env 미설정 시 5초마다 가상 열람이 흐르는 데모 피드로 동작.
 */
export default function LivePage() {
  const t = useTranslations("live");
  const tApp = useTranslations("app");
  const tBuilding = useTranslations("building");
  const format = useFormatter();

  const [rows, setRows] = useState<LiveRow[]>([]);
  const firstLoad = useRef(true);
  const [, setTick] = useState(0);

  // 상대시각("n분 전") 주기 갱신
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured) {
      const q = query(
        collection(getDb(), "liveFeed"),
        orderBy("viewedAt", "desc"),
        limit(30)
      );
      const unsub = onSnapshot(q, (snap) => {
        const isFirst = firstLoad.current;
        firstLoad.current = false;
        const addedIds = new Set(
          snap.docChanges().filter((c) => c.type === "added").map((c) => c.doc.id)
        );
        setRows(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              buildingName: (data.buildingName as string) ?? (data.buildingId as string),
              gender: (data.gender as Gender) ?? "male",
              viewerNickname: (data.viewerNickname as string) ?? "user",
              viewedAtMs: toMillis(data.viewedAt) ?? Date.now(),
              isNew: !isFirst && addedIds.has(d.id),
            };
          })
        );
      });
      return unsub;
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
                    {r.viewerNickname}
                  </td>
                  <td className="max-w-[130px] truncate px-3 py-2">{r.buildingName}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{tBuilding(r.gender)}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-muted-foreground">
                    {format.relativeTime(new Date(r.viewedAtMs))}
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
