import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createCustomTokenSafe, getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * 카카오 로그인 콜백 (T-202, TRD §3.2 Custom Token 방식)
 * 인가코드 → 카카오 토큰 교환 → 프로필 조회 → users 문서 upsert
 * → Firebase Custom Token 발급 → 앱으로 해시(#kakaoToken=)로 전달
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const locale = req.nextUrl.searchParams.get("state") ?? "ko";
  const back = (fragment: string) =>
    NextResponse.redirect(`${origin}/${locale}#${fragment}`);

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return back("kakaoError=NO_CODE");
  if (!process.env.KAKAO_REST_API_KEY) return back("kakaoError=NO_KAKAO_KEY");
  if (!isAdminConfigured) return back("kakaoError=NO_ADMIN");

  try {
    // ① 인가코드 → 액세스 토큰
    const tokenParams: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY!,
      redirect_uri: `${origin}/api/auth/kakao/callback`,
      code,
    };
    // 클라이언트 시크릿이 활성화된 경우 필수
    if (process.env.KAKAO_CLIENT_SECRET) {
      tokenParams.client_secret = process.env.KAKAO_CLIENT_SECRET;
    }
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams(tokenParams),
    });
    if (!tokenRes.ok) return back("kakaoError=TOKEN_EXCHANGE_FAILED");
    const { access_token: accessToken } = (await tokenRes.json()) as {
      access_token?: string;
    };
    if (!accessToken) return back("kakaoError=TOKEN_EXCHANGE_FAILED");

    // ② 카카오 프로필 조회 (서버에서 토큰 검증을 겸함)
    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) return back("kakaoError=PROFILE_FAILED");
    const me = (await meRes.json()) as {
      id: number;
      kakao_account?: { profile?: { nickname?: string } };
      properties?: { nickname?: string };
    };
    const kakaoId = String(me.id);
    const nickname =
      me.kakao_account?.profile?.nickname ??
      me.properties?.nickname ??
      `kakao-${kakaoId.slice(-4)}`;

    // ③ users 문서 upsert (ERD §2.1, freeReveals=3)
    const uid = `kakao:${kakaoId}`;
    const db = getAdminDb();
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists) {
      await userRef.set({
        nickname,
        provider: "kakao",
        phoneVerified: false,
        trustScore: 50,
        points: 0,
        freeReveals: 3,
        locale,
        createdAt: FieldValue.serverTimestamp(),
        lastActiveAt: FieldValue.serverTimestamp(),
      });
    }

    // ④ Firebase Custom Token 발급 → 클라이언트 signInWithCustomToken
    const customToken = await createCustomTokenSafe(uid, {
      provider: "kakao",
    });
    return back(`kakaoToken=${encodeURIComponent(customToken)}`);
  } catch (e) {
    console.error("[kakao callback]", e);
    return back("kakaoError=INTERNAL");
  }
}
