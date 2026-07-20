"use client";

import { useEffect, useState } from "react";

/**
 * 관리자 모드 — 헤더의 둥근 버튼에서 admin/2525 로그인 (사용자 지정 스펙).
 * 세션 단위로 유지되고, 관리자 API 호출 시 자격을 함께 보낸다.
 */
export const ADMIN_ID = "admin";
export const ADMIN_PW = "2525";

const KEY = "ktk-admin";
const EVENT = "ktk-admin-changed";

export function isAdminSession(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminSession(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** 관리자 여부를 구독하는 훅 */
export function useAdmin(): boolean {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    const sync = () => setAdmin(isAdminSession());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return admin;
}

/** 관리자 API 요청 공통 바디 */
export function adminCredentials() {
  return { adminId: ADMIN_ID, adminPw: ADMIN_PW };
}
