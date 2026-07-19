"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoginButtons from "./LoginButtons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoginSheet({ open, onOpenChange }: Props) {
  const t = useTranslations("login");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("desc")}</DialogDescription>
        </DialogHeader>
        <LoginButtons onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
