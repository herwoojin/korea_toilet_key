"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getClientAuth, getDb, isFirebaseConfigured } from "@/lib/firebase/client";

export interface UserProfile {
  nickname: string;
  provider: "google" | "kakao";
  phoneVerified: boolean;
  trustScore: number;
  points: number;
  freeReveals: number;
  /** 열람권이 마지막으로 갱신된 달 (YYYY-MM) — 매달 5개로 리셋 */
  freeRevealsMonth?: string;
  etiquetteAgreedAt?: unknown;
  locale?: string;
}

/** 열람권 정책: 최초 로그인 10개, 매달 5개로 갱신 */
export const INITIAL_REVEALS = 10;
export const MONTHLY_REVEALS = 5;
export const monthKey = () => new Date().toISOString().slice(0, 7);

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: false,
  configured: false,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthStateChanged(getClientAuth(), async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        setProfile(null);
        return;
      }
      // 최초 로그인 시 users 문서 생성 — 열람권 10개 지급
      const ref = doc(getDb(), "users", u.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          nickname: u.displayName ?? `user-${u.uid.slice(0, 5)}`,
          provider:
            u.providerData[0]?.providerId === "google.com" ? "google" : "kakao",
          phoneVerified: false,
          trustScore: 50,
          points: 0,
          freeReveals: INITIAL_REVEALS,
          freeRevealsMonth: monthKey(),
          locale: "ko",
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        });
      } else if (snap.data().freeRevealsMonth !== monthKey()) {
        // 매달 열람권 갱신 — 무료 5개
        await updateDoc(ref, {
          freeReveals: MONTHLY_REVEALS,
          freeRevealsMonth: monthKey(),
        }).catch(() => undefined);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;
    const unsub = onSnapshot(doc(getDb(), "users", user.uid), (s) =>
      setProfile((s.data() as UserProfile) ?? null)
    );
    return unsub;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, configured: isFirebaseConfigured }}
    >
      {children}
    </AuthContext.Provider>
  );
}
