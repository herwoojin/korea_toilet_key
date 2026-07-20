"use client";

import { doc, increment, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";

/**
 * 열람권 차감 — 비밀번호를 처음 열람할 때 1개 사용.
 * 같은 핀·성별을 같은 기기에서 다시 봐도 중복 차감하지 않는다.
 */
const KEY = (pinId: string, gender: string) => `ktk-revealed:${pinId}:${gender}`;

export function hasRevealCharged(pinId: string, gender: string): boolean {
  try {
    return localStorage.getItem(KEY(pinId, gender)) === "1";
  } catch {
    return false;
  }
}

export function markRevealCharged(pinId: string, gender: string): void {
  try {
    localStorage.setItem(KEY(pinId, gender), "1");
  } catch {
    /* ignore */
  }
}

/** Firestore 사용자 문서에서 열람권 1개 차감 (실패해도 UX는 진행) */
export async function chargeRevealCredit(uid: string): Promise<void> {
  await updateDoc(doc(getDb(), "users", uid), { freeReveals: increment(-1) });
}
