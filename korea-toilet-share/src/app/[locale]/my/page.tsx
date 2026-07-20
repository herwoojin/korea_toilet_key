"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuroraBackground } from "@/components/ui/digital-aurora";
import { Input } from "@/components/ui/input";
import LoginSheet from "@/components/common/LoginSheet";
import { useAuth } from "@/components/providers/AuthProvider";
import { getDb } from "@/lib/firebase/client";
import { toMillis } from "@/types/building";

interface ViewLogRow {
  id: string;
  buildingId: string;
  buildingName?: string;
  gender: "male" | "female";
  viewedAt: unknown;
}

interface PinRow {
  createdByUid?: string;
  views?: number;
  toilets?: {
    male?: { correctCount?: number };
    female?: { correctCount?: number };
  };
}

/** 내 정보 — 포인트/무료 열람권/열람 기록 (T-402, T-405의 기반) */
export default function MyPage() {
  const t = useTranslations("my");
  const tBuilding = useTranslations("building");
  const format = useFormatter();
  const { user, profile, configured } = useAuth();

  const [loginOpen, setLoginOpen] = useState(false);
  const [logs, setLogs] = useState<ViewLogRow[]>([]);
  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [nickname, setNickname] = useState("");
  const [savingNick, setSavingNick] = useState(false);
  const [savedNick, setSavedNick] = useState(false);

  // 프로필 로드/변경 시 닉네임 입력값 동기화
  useEffect(() => {
    if (profile?.nickname) setNickname(profile.nickname);
  }, [profile?.nickname]);

  async function saveNickname() {
    if (!user || !nickname.trim()) return;
    setSavingNick(true);
    setSavedNick(false);
    try {
      await updateDoc(doc(getDb(), "users", user.uid), {
        nickname: nickname.trim(),
      });
      setSavedNick(true);
      setTimeout(() => setSavedNick(false), 2500);
    } finally {
      setSavingNick(false);
    }
  }

  // 포인트: 내가 등록한 핀이 받은 맞아요 ×10 + 열람 ×1 (시트 데이터에서 계산)
  useEffect(() => {
    if (!configured || !user) return;
    fetch("/api/pins", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { buildings?: PinRow[] } | null) => {
        if (!d?.buildings) return;
        const mine = d.buildings.filter((b) => b.createdByUid === user.uid);
        const pts = mine.reduce(
          (sum, b) =>
            sum +
            ((b.toilets?.male?.correctCount ?? 0) +
              (b.toilets?.female?.correctCount ?? 0)) *
              10 +
            (b.views ?? 0),
          0
        );
        setMyPoints(pts);
      })
      .catch(() => undefined);
  }, [configured, user]);

  useEffect(() => {
    if (!configured || !user) return;
    getDocs(
      query(
        collection(getDb(), "viewLogs"),
        where("viewerId", "==", user.uid),
        limit(50)
      )
    )
      .then((snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ViewLogRow, "id">) }));
        rows.sort((a, b) => (toMillis(b.viewedAt) ?? 0) - (toMillis(a.viewedAt) ?? 0));
        setLogs(rows);
      })
      .catch(() => undefined);
  }, [configured, user]);

  if (!configured || !user) {
    return (
      <div className="relative min-h-full">
        <AuroraBackground className="fixed inset-0" />
        <div className="relative mx-auto max-w-lg space-y-3 p-4">
          <h1 className="text-xl font-bold text-white drop-shadow">{t("title")}</h1>
          <p className="text-sm text-white/75">{t("loginFirst")}</p>
          {configured && (
            <>
              <Button onClick={() => setLoginOpen(true)}>{t("loginFirst")}</Button>
              <LoginSheet open={loginOpen} onOpenChange={setLoginOpen} />
            </>
          )}
        </div>
      </div>
    );
  }

  const glassCard = "border-white/20 bg-card/95 shadow-xl backdrop-blur";

  return (
    <div className="relative min-h-full">
      {/* 오로라 배경 — 콘텐츠 뒤 전체 화면 */}
      <AuroraBackground className="fixed inset-0" />
      <div className="relative mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-xl font-bold text-white drop-shadow">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("points")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{myPoints ?? 0}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t("pointsDesc")}
            </p>
          </CardContent>
        </Card>
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t("freeReveals")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{profile?.freeReveals ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-base">{t("settings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="block text-sm font-medium">{t("nickname")}</label>
          <p className="text-xs text-muted-foreground">{t("nicknameDesc")}</p>
          <div className="flex gap-2">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
            <Button
              onClick={saveNickname}
              disabled={savingNick || !nickname.trim() || nickname.trim() === profile?.nickname}
              className="shrink-0"
            >
              {t("save")}
            </Button>
          </div>
          {savedNick && <p className="text-sm text-green-600">{t("saved")}</p>}
        </CardContent>
      </Card>

      <Card className={glassCard}>
        <CardHeader>
          <CardTitle className="text-base">{t("history")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("historyNote")}</p>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => {
                const ms = toMillis(log.viewedAt);
                return (
                  <li key={log.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {log.buildingName ?? log.buildingId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ms != null &&
                          format.dateTime(new Date(ms), { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </span>
                    <Badge variant="secondary">{tBuilding(log.gender)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
