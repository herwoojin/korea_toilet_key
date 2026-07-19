// 서버 전용 — Google Sheets(Apps Script Web App) 저장소 어댑터
// firebase-admin 없이 동작: 토큰 검증은 Identity Toolkit REST, 저장은 시트 웹앱
import { ApiError } from "@/lib/server/errors";
import type { Building, Gender } from "@/types/building";

export const isSheetsConfigured = Boolean(process.env.SHEETS_WEBAPP_URL);

/** 시트 한 행 (scripts/sheets-webapp.gs HEADERS와 동일) */
export interface SheetPin {
  id: string;
  createdAt: string;
  name: string;
  storeName: string;
  address: string;
  lat: number;
  lng: number;
  malePw: string;
  femalePw: string;
  nickname: string;
  uid: string;
  correctCount: number;
  wrongCount: number;
}

/**
 * Firebase ID 토큰 검증 (Admin SDK 불필요) — Identity Toolkit accounts:lookup
 * 웹 API 키만 있으면 되므로 Netlify에서 서비스 계정 키 없이 동작한다.
 */
export async function requireUidViaRest(req: Request): Promise<string> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) throw new ApiError(503, "NO_AUTH_KEY");
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "UNAUTHENTICATED");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    }
  );
  if (!res.ok) throw new ApiError(401, "UNAUTHENTICATED");
  const data = (await res.json()) as { users?: { localId?: string }[] };
  const uid = data.users?.[0]?.localId;
  if (!uid) throw new ApiError(401, "UNAUTHENTICATED");
  return uid;
}

function webAppUrl(): string {
  const url = process.env.SHEETS_WEBAPP_URL;
  if (!url) throw new ApiError(503, "NO_SHEETS");
  return url;
}

/** 시트 전체 핀 조회 */
export async function fetchSheetPins(): Promise<SheetPin[]> {
  const res = await fetch(webAppUrl(), { redirect: "follow", cache: "no-store" });
  if (!res.ok) throw new ApiError(502, "SHEETS_READ_FAILED");
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; pins?: SheetPin[] }
    | null;
  if (!data?.ok) throw new ApiError(502, "SHEETS_READ_FAILED");
  return data.pins ?? [];
}

/** Apps Script doPost 호출 (add / feedback) */
export async function postToSheet(
  body: Record<string, unknown>
): Promise<{ ok: boolean; id?: string; error?: string }> {
  // Apps Script는 302 리다이렉트로 응답을 전달하므로 follow 필수
  const res = await fetch(webAppUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    redirect: "follow",
  });
  if (!res.ok) throw new ApiError(502, "SHEETS_WRITE_FAILED");
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; id?: string; error?: string }
    | null;
  if (!data?.ok) throw new ApiError(502, data?.error ?? "SHEETS_WRITE_FAILED");
  return data as { ok: boolean; id?: string; error?: string };
}

/** 시트 행 → 앱 공용 Building 타입 (비번 포함 — 시트 자체가 공개 저장소) */
export function rowToBuilding(r: SheetPin): Building {
  const malePw = String(r.malePw ?? "").trim();
  const femalePw = String(r.femalePw ?? "").trim();
  const counts = {
    correctCount: Number(r.correctCount) || 0,
    wrongCount: Number(r.wrongCount) || 0,
  };
  const toilet = (pw: string, withCounts: boolean) =>
    pw
      ? {
          exists: true,
          hasPassword: true,
          confidence: "low" as const,
          reportCount: 1,
          ...(withCounts ? counts : { correctCount: 0, wrongCount: 0 }),
        }
      : { exists: false, hasPassword: false };
  const passwords: Partial<Record<Gender, string>> = {};
  if (malePw) passwords.male = malePw;
  if (femalePw) passwords.female = femalePw;
  const createdMs = Date.parse(String(r.createdAt));
  return {
    id: String(r.id),
    name: String(r.name || r.address || r.id),
    storeName: String(r.storeName || "") || undefined,
    address: String(r.address || ""),
    lat: Number(r.lat),
    lng: Number(r.lng),
    geohash: "",
    status: "active",
    createdByNickname: String(r.nickname || "") || undefined,
    createdAt: Number.isNaN(createdMs) ? null : createdMs,
    updatedAt: Number.isNaN(createdMs) ? null : createdMs,
    // 카운트는 핀 단위 저장 → 합산 중복을 피하려고 첫 성별에만 부여
    toilets: {
      male: toilet(malePw, true),
      female: toilet(femalePw, !malePw),
    },
    passwords,
  };
}
