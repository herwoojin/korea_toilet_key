"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getClientAuth, getDb, isFirebaseConfigured } from "@/lib/firebase/client";

export interface UserProfile {
  nickname: string;
  provider: "google" | "kakao";
  phoneVerified: boolean;
  trustScore: number;
  points: number;
  freeReveals: number;
  etiquetteAgreedAt?: unknown;
  locale?: string;
}

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
      // 최초 로그인 시 users 문서 생성 (ERD §2.1, freeReveals=3)
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
          freeReveals: 3,
          locale: "ko",
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        });
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
