"use client";

import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/AuthProvider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgreed: () => void;
}

/** 최초 비밀번호 열람 시도 전 1회 표시되는 에티켓 서약 (FR-08, T-203) */
export default function EtiquettePledgeModal({ open, onOpenChange, onAgreed }: Props) {
  const t = useTranslations("etiquette");
  const { user, configured } = useAuth();
  const [busy, setBusy] = useState(false);

  async function agree() {
    setBusy(true);
    try {
      if (configured && user) {
        await updateDoc(doc(getDb(), "users", user.uid), {
          etiquetteAgreedAt: serverTimestamp(),
        });
      }
      onOpenChange(false);
      onAgreed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>{t("p1")}</li>
          <li>{t("p2")}</li>
          <li>{t("p3")}</li>
        </ul>
        <Button onClick={agree} disabled={busy}>
          {t("agree")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
