"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasVoted, markVoted } from "@/lib/votes";

interface Props {
  buildingId: string;
  /** 데모 모드 — 서버 호출 없이 완료 처리 */
  demo?: boolean;
}

/** 열람 직후 "맞았어요/틀렸어요" — 구글시트 카운트 반영, 1인 1회 (FR-12) */
export default function FeedbackButtons({ buildingId, demo }: Props) {
  const t = useTranslations("feedback");
  const { user } = useAuth();
  // 이미 평가한 핀이면 처음부터 완료 상태로
  const [done, setDone] = useState(() => !demo && hasVoted(buildingId));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send(result: "correct" | "wrong") {
    setBusy(true);
    setMsg(null);
    try {
      if (demo || !user) {
        setDone(true);
        return;
      }
      if (hasVoted(buildingId)) {
        setDone(true);
        setMsg(t("already"));
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch("/api/pins", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: buildingId, result }),
      });
      if (res.ok) {
        markVoted(buildingId);
        setDone(true);
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (data?.error === "ALREADY_VOTED") {
        markVoted(buildingId);
        setDone(true);
        setMsg(t("already"));
      } else {
        setMsg(t("error"));
      }
    } catch {
      setMsg(t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {msg ?? t("thanks")}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-center text-sm text-muted-foreground">{t("question")}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => send("correct")}
        >
          <ThumbsUp className="h-4 w-4" />
          {t("correct")}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => send("wrong")}
        >
          <ThumbsDown className="h-4 w-4" />
          {t("wrong")}
        </Button>
      </div>
      {msg && <p className="text-center text-xs text-destructive">{msg}</p>}
    </div>
  );
}
