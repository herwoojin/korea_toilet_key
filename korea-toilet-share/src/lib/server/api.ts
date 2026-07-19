import { getAdminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/errors";

// firebase-admin 없이 쓰는 라우트는 @/lib/server/errors 를 직접 import할 것
export { ApiError, handleApiError } from "@/lib/server/errors";

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
