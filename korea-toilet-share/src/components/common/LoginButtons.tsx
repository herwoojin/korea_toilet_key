"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";

interface Props {
  onSuccess?: () => void;
  /** 카카오 콜백 등 외부에서 전달된 에러 메시지 */
  extraError?: string | null;
}

/** Google + Kakao 로그인 버튼 (첫 로그인 화면과 LoginSheet에서 공용) */
export default function LoginButtons({ onSuccess, extraError }: Props) {
  const t = useTranslations("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loginGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithPopup(getClientAuth(), new GoogleAuthProvider());
      onSuccess?.();
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
        {t("needSetup")}
      </p>
    );
  }

  const shownError = error ?? extraError;

  return (
    <div className="flex w-full flex-col gap-2">
      <Button onClick={loginGoogle} disabled={busy}>
        {t("google")}
      </Button>
      {shownError && <p className="text-sm text-destructive">{shownError}</p>}
    </div>
  );
}
