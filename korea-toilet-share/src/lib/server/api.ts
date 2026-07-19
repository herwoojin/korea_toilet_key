import { NextResponse } from "next/server";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase/admin";

/** Route Handler 공용 에러 — code는 클라이언트 i18n 매핑용 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string
  ) {
    super(code);
  }
}

/** Authorization: Bearer <Firebase ID Token> 검증 → uid 반환 */
export async function requireUid(req: Request): Promise<string> {
  if (!isAdminConfigured) throw new ApiError(503, "NO_ADMIN");
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "UNAUTHENTICATED");
  // Admin SDK 초기화 실패(키 누락·ADC 부재)는 토큰 문제와 구분해 503으로
  let auth;
  try {
    auth = getAdminAuth();
  } catch (e) {
    console.error("[api] admin init failed", e);
    throw new ApiError(503, "NO_ADMIN");
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new ApiError(401, "UNAUTHENTICATED");
  }
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.code }, { status: e.status });
  }
  console.error("[api] unexpected error", e);
  return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
}
