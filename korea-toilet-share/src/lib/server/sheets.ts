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
  const url = process.env.SHEETS_WEBAPP_URL?.trim();
  if (!url) throw new ApiError(503, "NO_SHEETS");
  // 흔한 실수 즉시 감지: 시트 링크를 넣거나 /exec가 아닌 URL을 넣은 경우
  if (!url.includes("script.google.com")) {
    throw new ApiError(503, "BAD_SHEETS_URL", "SHEETS_WEBAPP_URL은 Apps Script 배포 URL(script.google.com/macros/…/exec)이어야 합니다");
  }
  if (!url.endsWith("/exec")) {
    throw new ApiError(503, "BAD_SHEETS_URL", "URL이 /exec로 끝나야 합니다 (테스트용 /dev 아님)");
  }
  return url;
}

/** Apps Script 응답 파싱 — 로그인 페이지(HTML)가 오면 배포 설정 문제를 detail로 알려줌 */
async function parseScriptResponse<T>(res: Response, failCode: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(502, failCode, `Apps Script HTTP ${res.status}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    let hint: string;
    if (/accounts\.google\.com|로그인|Sign in/i.test(text)) {
      hint = "웹앱이 로그인 페이지를 반환 — 배포의 '액세스 권한'을 '모든 사용자'로 재배포 필요";
    } else {
      // HTML 오류 페이지에서 사람이 읽을 텍스트만 추출해 원인 노출
      const visible = text
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      hint = `Apps Script 응답: ${visible.slice(0, 200)}`;
    }
    throw new ApiError(502, failCode, hint);
  }
}

/** 시트 전체 핀 조회 */
export async function fetchSheetPins(): Promise<SheetPin[]> {
  const res = await fetch(webAppUrl(), { redirect: "follow", cache: "no-store" });
  const data = await parseScriptResponse<{ ok?: boolean; pins?: SheetPin[]; error?: string }>(
    res,
    "SHEETS_READ_FAILED"
  );
  if (!data.ok) throw new ApiError(502, "SHEETS_READ_FAILED", data.error);
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
  const data = await parseScriptResponse<{ ok?: boolean; id?: string; error?: string }>(
    res,
    "SHEETS_WRITE_FAILED"
  );
  if (!data.ok) throw new ApiError(502, "SHEETS_WRITE_FAILED", data.error);
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
