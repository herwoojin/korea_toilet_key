"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { LocateFixed, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import LoginButtons from "@/components/common/LoginButtons";
import { useAuth } from "@/components/providers/AuthProvider";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";

type GeoState = "checking" | "prompt" | "denied" | "granted";

/**
 * 앱 진입 게이트:
 * ① 첫 로그인 화면 (Google/Kakao) — 로그인 없이는 앱 사용 불가
 * ② 위치 권한 필수 — 허용해야만 서비스 이용 가능
 */
export default function AppGate({ children }: { children: ReactNode }) {
  const t = useTranslations("gate");
  const tLogin = useTranslations("login");
  const tApp = useTranslations("app");
  const { user, loading } = useAuth();

  const [demoPass, setDemoPass] = useState(false);
  const [kakaoError, setKakaoError] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoState>("checking");

  // 카카오 콜백 해시 처리 (#kakaoToken= / #kakaoError=)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const token = params.get("kakaoToken");
    const err = params.get("kakaoError");
    if (token || err) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
    if (token && isFirebaseConfigured) {
      signInWithCustomToken(getClientAuth(), token).catch(() =>
        setKakaoError(tLogin("kakaoError"))
      );
    } else if (err) {
      setKakaoError(tLogin("kakaoError"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 데모 통과 상태 복원
  useEffect(() => {
    try {
      if (sessionStorage.getItem("demoPass") === "1") setDemoPass(true);
    } catch {
      /* ignore */
    }
  }, []);

  // 위치 권한 상태 확인 (프롬프트 없이 조회)
  useEffect(() => {
    let active = true;
    async function check() {
      try {
        if (navigator.permissions?.query) {
          const st = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });
          if (!active) return;
          if (st.state === "granted") setGeo("granted");
          else if (st.state === "denied") setGeo("denied");
          else setGeo("prompt");
          st.onchange = () => {
            if (st.state === "granted") setGeo("granted");
            else if (st.state === "denied") setGeo("denied");
          };
        } else {
          setGeo("prompt");
        }
      } catch {
        setGeo("prompt");
      }
    }
    check();
    return () => {
      active = false;
    };
  }, []);

  const requestGeo = useCallback(() => {
    setGeo("checking");
    if (!("geolocation" in navigator)) {
      setGeo("granted");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setGeo("granted"),
      // 권한 거부(code 1)만 차단 — GPS 신호 문제(2,3)로는 앱을 막지 않는다
      (err) => setGeo(err.code === 1 ? "denied" : "granted"),
      { timeout: 10000 }
    );
  }, []);

  const authed = isFirebaseConfigured ? Boolean(user) : demoPass;

  if (isFirebaseConfigured && loading) {
    return (
      <GateShell>
        <p className="text-sm text-muted-foreground">…</p>
      </GateShell>
    );
  }

  // ① 첫 로그인 화면
  if (!authed) {
    return (
      <GateShell>
        <svg viewBox="0 0 64 64" className="h-24 w-24" aria-hidden>
          <path d="M32 2C18.7 2 8 12.7 8 26c0 17 24 36 24 36s24-19 24-36C56 12.7 45.3 2 32 2z" fill="#2563EB" />
          <circle cx="24" cy="15" r="3.2" fill="#fff" />
          <rect x="20.9" y="19.3" width="6.2" height="8.6" rx="2" fill="#fff" />
          <rect x="21.7" y="27.9" width="2.1" height="6.6" fill="#fff" />
          <rect x="24.3" y="27.9" width="2.1" height="6.6" fill="#fff" />
          <circle cx="40" cy="15" r="3.2" fill="#fff" />
          <path d="M40 19l-4.4 9.6h8.8z" fill="#fff" />
          <rect x="38" y="28.6" width="1.8" height="6" fill="#fff" />
          <rect x="40.2" y="28.6" width="1.8" height="6" fill="#fff" />
          <rect x="27.6" y="41.5" width="8.8" height="7.2" rx="1.6" fill="#fff" />
          <path d="M29.6 41.5v-3a2.5 2.5 0 0 1 5-.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <div>
          <h1 className="text-2xl font-bold">{tApp("shortName")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tApp("name")}</p>
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{tLogin("tagline")}</p>
        <div className="w-full max-w-xs">
          <LoginButtons extraError={kakaoError} />
        </div>
        {!isFirebaseConfigured && (
          <Button
            variant="outline"
            className="w-full max-w-xs"
            onClick={() => {
              setDemoPass(true);
              try {
                sessionStorage.setItem("demoPass", "1");
              } catch {
                /* ignore */
              }
            }}
          >
            {tLogin("demoContinue")}
          </Button>
        )}
      </GateShell>
    );
  }

  // ② 위치 권한 필수 게이트
  if (geo !== "granted") {
    return (
      <GateShell>
        <MapPin className="h-14 w-14 text-primary" />
        {geo === "checking" ? (
          <p className="text-sm text-muted-foreground">{t("checking")}</p>
        ) : geo === "denied" ? (
          <>
            <h1 className="text-xl font-bold">{t("deniedTitle")}</h1>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("deniedBody")}
            </p>
            <Button onClick={requestGeo}>
              <LocateFixed className="h-4 w-4" />
              {t("retry")}
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">{t("locationTitle")}</h1>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("locationBody")}
            </p>
            <Button onClick={requestGeo}>
              <LocateFixed className="h-4 w-4" />
              {t("allow")}
            </Button>
          </>
        )}
      </GateShell>
    );
  }

  return <>{children}</>;
}

function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      {children}
    </div>
  );
}
