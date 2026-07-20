"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ADMIN_ID, ADMIN_PW, setAdminSession, useAdmin } from "@/lib/admin";

/** 헤더 우측 둥근 관리자 버튼 — admin/2525 로그인으로 관리자 모드 토글 */
export default function AdminButton() {
  const t = useTranslations("admin");
  const admin = useAdmin();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function login() {
    if (id.trim() === ADMIN_ID && pw.trim() === ADMIN_PW) {
      setAdminSession(true);
      setError(false);
      setOpen(false);
      setId("");
      setPw("");
    } else {
      setError(true);
    }
  }

  return (
    <>
      <button
        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
          admin
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-accent"
        }`}
        title={t("title")}
        aria-label={t("title")}
        onClick={() => setOpen(true)}
      >
        <Shield className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {admin ? t("activeDesc") : t("loginDesc")}
            </DialogDescription>
          </DialogHeader>
          {admin ? (
            <Button
              variant="outline"
              onClick={() => {
                setAdminSession(false);
                setOpen(false);
              }}
            >
              {t("logout")}
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder={t("id")}
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoComplete="off"
              />
              <Input
                type="password"
                placeholder={t("pw")}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                autoComplete="off"
              />
              {error && <p className="text-sm text-destructive">{t("wrong")}</p>}
              <Button className="w-full" onClick={login}>
                {t("login")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
