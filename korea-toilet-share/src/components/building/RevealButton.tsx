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
import type { Gender } from "@/types/building";
import FeedbackButtons from "./FeedbackButtons";

interface Props {
  buildingId: string;
  gender: Gender;
}

interface Revealed {
  password: string;
  viewLogId: string | null;
  demo: boolean;
}

function getGps(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 }
    );
  });
}

/**
 * ★ 비밀번호 열람 버튼 (T-204)
 * 가림 → 탭 → (로그인/서약 확인) → "열람 기록이 남습니다" 컨펌 → /api/reveal → 표시
 * 비밀번호는 절대 클라이언트가 Firestore에서 직접 읽지 않는다.
 */
export default function RevealButton({ buildingId, gender }: Props) {
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

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      if (!configured) {
        const demo = MOCK_SECRETS[buildingId]?.[gender] ?? getLocalSecret(buildingId, gender);
        setRevealed({ password: demo ?? "1234*", viewLogId: null, demo: true });
        setConfirmOpen(false);
        return;
      }
      const gps = await getGps();
      const token = await user!.getIdToken();
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ buildingId, gender, lat: gps?.lat, lng: gps?.lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data?.error as string | undefined;
        if (code === "ETIQUETTE_REQUIRED") {
          setConfirmOpen(false);
          setPledgeOpen(true);
        } else if (code === "NO_CREDIT") {
          setError(t("noCredit"));
        } else if (code === "NO_ADMIN") {
          setError(t("needSetup"));
        } else {
          setError(t("error"));
        }
        return;
      }
      setRevealed({ password: data.password, viewLogId: data.viewLogId, demo: false });
      setConfirmOpen(false);
    } catch {
      setError(t("error"));
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
        <FeedbackButtons
          buildingId={buildingId}
          gender={gender}
          viewLogId={revealed.viewLogId}
        />
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
