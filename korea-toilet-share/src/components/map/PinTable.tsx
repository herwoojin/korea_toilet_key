"use client";

import { useState } from "react";
import { RefreshCw, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import EtiquettePledgeModal from "@/components/common/EtiquettePledgeModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { MOCK_SECRETS } from "@/lib/mock/buildings";
import { getLocalSecret } from "@/lib/mock/localPins";
import { hasVoted, markVoted } from "@/lib/votes";
import { toMillis, type Building, type Gender } from "@/types/building";

interface Props {
  buildings: Building[];
  onClose: () => void;
  onRefresh?: () => void;
  onRowClick?: (b: Building) => void;
}

/**
 * 핀 목록 표 — 컬럼 순서: 건물명 · 점포명 · 남자비번 · 여자비번 · 등록일 · 등록자 · 맞아요 · 틀려요
 * 비번은 가려져 있고 탭하면 열람(기록 저장) 후 표시. 열람 후 맞아요/틀려요 평가 가능.
 */
export default function PinTable({ buildings, onClose, onRefresh, onRowClick }: Props) {
  const t = useTranslations("pin");
  const tReveal = useTranslations("reveal");
  const tFeedback = useTranslations("feedback");
  const format = useFormatter();
  const { user, profile } = useAuth();

  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, { c: number; w: number }>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pledgeOpen, setPledgeOpen] = useState(false);

  function baseCounts(b: Building) {
    const c =
      (b.toilets?.male?.correctCount ?? 0) + (b.toilets?.female?.correctCount ?? 0);
    const w =
      (b.toilets?.male?.wrongCount ?? 0) + (b.toilets?.female?.wrongCount ?? 0);
    return { c, w };
  }

  async function revealPw(b: Building, gender: Gender) {
    setMsg(null);
    const key = `${b.id}:${gender}`;
    if (!isFirebaseConfigured) {
      const v = MOCK_SECRETS[b.id]?.[gender] ?? getLocalSecret(b.id, gender);
      if (v) setRevealed((prev) => ({ ...prev, [key]: v }));
      return;
    }
    if (!user) {
      setMsg(tReveal("loginRequired"));
      return;
    }
    if (!profile?.etiquetteAgreedAt) {
      setPledgeOpen(true);
      return;
    }
    // 구글시트 저장소 — 비번이 목록 데이터에 포함되어 있어 서버 호출 없이 표시
    const v = b.passwords?.[gender];
    if (v) setRevealed((prev) => ({ ...prev, [key]: v }));
    else setMsg(tReveal("error"));
  }

  async function feedback(b: Building, result: "correct" | "wrong") {
    setMsg(null);
    const bump = () =>
      setCounts((prev) => {
        const cur = prev[b.id] ?? baseCounts(b);
        return {
          ...prev,
          [b.id]: {
            c: cur.c + (result === "correct" ? 1 : 0),
            w: cur.w + (result === "wrong" ? 1 : 0),
          },
        };
      });

    if (!isFirebaseConfigured) {
      bump();
      return;
    }
    if (!user) {
      setMsg(tReveal("loginRequired"));
      return;
    }
    // 1인 1회 — 기기 단 선차단 (서버 uid 검증의 보조)
    if (hasVoted(b.id)) {
      setMsg(tFeedback("already"));
      return;
    }
    try {
      const token = await user.getIdToken();
      // 구글시트 저장소 — 핀 id 기준 카운트 증가
      const res = await fetch("/api/pins", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: b.id, result }),
      });
      if (res.ok) {
        markVoted(b.id);
        bump();
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (data?.error === "ALREADY_VOTED") {
        markVoted(b.id);
        setMsg(tFeedback("already"));
      } else {
        setMsg(tFeedback("error"));
      }
    } catch {
      setMsg(tFeedback("error"));
    }
  }

  function PwCell({ b, gender }: { b: Building; gender: Gender }) {
    const toilet = b.toilets?.[gender];
    if (!toilet?.exists || !toilet.hasPassword) {
      return <span className="text-muted-foreground">-</span>;
    }
    const value = revealed[`${b.id}:${gender}`];
    if (value) {
      return <span className="font-mono font-bold text-primary">{value}</span>;
    }
    return (
      <button
        className="rounded bg-secondary px-2 py-0.5 font-mono text-xs hover:bg-secondary/70"
        onClick={(e) => {
          e.stopPropagation();
          revealPw(b, gender);
        }}
        title={tReveal("confirmBody")}
      >
        ••••
      </button>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1003] flex max-h-[60%] flex-col rounded-t-2xl border-t bg-background shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-semibold">{t("list")}</p>
          <p className="text-xs text-primary">{t("total", { count: buildings.length })}</p>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("refresh")}
            </button>
          )}
          <button onClick={onClose} aria-label="close">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <p className="px-4 pb-2 text-[11px] leading-relaxed text-muted-foreground">
        {t("syncNote")}
      </p>
      {msg && <p className="px-4 pb-2 text-xs text-destructive">{msg}</p>}
      <div className="overflow-auto border-t">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("colBuilding")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("colStore")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("colMalePw")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("colFemalePw")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("colDate")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("colBy")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("colCorrect")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("colWrong")}</th>
            </tr>
          </thead>
          <tbody>
            {buildings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              buildings.map((b) => {
                const cnt = counts[b.id] ?? baseCounts(b);
                const createdMs = toMillis(b.createdAt) ?? toMillis(b.updatedAt);
                return (
                  <tr
                    key={b.id}
                    className="cursor-pointer border-t hover:bg-accent/50"
                    onClick={() => onRowClick?.(b)}
                  >
                    <td className="max-w-[140px] truncate px-3 py-2 font-medium">{b.name}</td>
                    <td className="max-w-[110px] truncate px-3 py-2 text-muted-foreground">
                      {b.storeName ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <PwCell b={b} gender="male" />
                    </td>
                    <td className="px-3 py-2">
                      <PwCell b={b} gender="female" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {createdMs != null
                        ? format.dateTime(new Date(createdMs), { dateStyle: "short" })
                        : "-"}
                    </td>
                    <td className="max-w-[90px] truncate px-3 py-2 text-xs text-muted-foreground">
                      {b.createdByNickname ?? "-"}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          feedback(b, "correct");
                        }}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {cnt.c}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          feedback(b, "wrong");
                        }}
                      >
                        <ThumbsDown className="h-3 w-3" />
                        {cnt.w}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <EtiquettePledgeModal
        open={pledgeOpen}
        onOpenChange={setPledgeOpen}
        onAgreed={() => setMsg(null)}
      />
    </div>
  );
}
