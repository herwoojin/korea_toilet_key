"use client";

import { useState } from "react";
import { Eye, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EtiquettePledgeModal from "@/components/common/EtiquettePledgeModal";
import LoginSheet from "@/components/common/LoginSheet";
import { useAuth } from "@/components/providers/AuthProvider";
import { MOCK_SECRETS } from "@/lib/mock/buildings";
import { getLocalSecret } from "@/lib/mock/localPins";
import { hasViewed, markViewed } from "@/lib/votes";
import type { Building, Gender } from "@/types/building";
import FeedbackButtons from "./FeedbackButtons";

interface Props {
  building: Building;
  gender: Gender;
}

interface Revealed {
  password: string;
  demo: boolean;
}

/**
 * ★ 비밀번호 열람 버튼 (T-204)
 * 가림 → 탭 → (로그인/서약 확인) → "열람 기록이 남습니다" 컨펌 → 표시
 * 구글시트 저장소 모드 — 비번은 핀 목록 데이터(building.passwords)에 포함되어 있다.
 */
export default function RevealButton({ building, gender }: Props) {
  const t = useTranslations("reveal");
  const { user, profile, configured } = useAuth();

  const [loginOpen, setLoginOpen] = useState(false);
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Revealed | null>(null);

  function start() {
    setError(null);
    if (!configured) {
      // 데모 모드: 목업 비밀번호로 UX 흐름만 시연
      setConfirmOpen(true);
      return;
    }
    if (!user) {
      setLoginOpen(true);
      return;
    }
    if (!profile?.etiquetteAgreedAt) {
      setPledgeOpen(true);
      return;
    }
    setConfirmOpen(true);
  }

  function reveal() {
    setBusy(true);
    setError(null);
    try {
      if (!configured) {
        const demo =
          MOCK_SECRETS[building.id]?.[gender] ?? getLocalSecret(building.id, gender);
        setRevealed({ password: demo ?? "1234*", demo: true });
        setConfirmOpen(false);
        return;
      }
      // 구글시트 저장소 — 비번이 핀 데이터에 포함되어 있어 서버 호출 불필요
      const pw = building.passwords?.[gender];
      if (!pw) {
        setError(t("error"));
        return;
      }
      setRevealed({ password: pw, demo: false });
      setConfirmOpen(false);
      // 열람(관심) 집계 — 등록자 포인트 산정용, 기기당 핀별 1회
      if (user && !hasViewed(building.id)) {
        markViewed(building.id);
        user
          .getIdToken()
          .then((token) =>
            fetch("/api/pins", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ id: building.id, view: true }),
            })
          )
          .catch(() => undefined);
      }
    } finally {
      setBusy(false);
    }
  }

  if (revealed) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="font-mono text-3xl font-bold tracking-widest text-primary">
            {revealed.password}
          </p>
          {revealed.demo && (
            <p className="mt-1 text-xs text-muted-foreground">{t("demo")}</p>
          )}
        </div>
        <FeedbackButtons buildingId={building.id} demo={revealed.demo} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={start}>
        <Lock className="h-4 w-4" />
        {t("show")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>{t("confirmBody")}</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button className="flex-1" onClick={reveal} disabled={busy}>
              <Eye className="h-4 w-4" />
              {t("confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LoginSheet open={loginOpen} onOpenChange={setLoginOpen} />
      <EtiquettePledgeModal
        open={pledgeOpen}
        onOpenChange={setPledgeOpen}
        onAgreed={() => setConfirmOpen(true)}
      />
    </div>
  );
}
