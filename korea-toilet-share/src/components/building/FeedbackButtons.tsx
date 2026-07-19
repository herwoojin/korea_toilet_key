"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Gender } from "@/types/building";

interface Props {
  buildingId: string;
  gender: Gender;
  /** 데모 모드에서는 null */
  viewLogId: string | null;
}

/** 열람 직후 "맞았어요/틀렸어요" — 신뢰도 실시간 보정 (FR-12, T-206) */
export default function FeedbackButtons({ buildingId, gender, viewLogId }: Props) {
  const t = useTranslations("feedback");
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(result: "correct" | "wrong") {
    setBusy(true);
    try {
      if (viewLogId && user) {
        const token = await user.getIdToken();
        await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ viewLogId, buildingId, gender, result }),
        });
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-center text-sm text-muted-foreground">{t("thanks")}</p>;
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
    </div>
  );
}
