import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 카카오 로그인 시작 (T-202) — REST 키를 서버에만 두기 위해 인가 URL을 서버에서 조립해 302 리다이렉트.
 * Kakao Developers 콘솔에 Redirect URI 등록 필요: {origin}/api/auth/kakao/callback
 */
export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") ?? "ko";
  // Netlify에서 req.nextUrl.origin은 브랜치 URL(main--*.netlify.app)로 잡혀 redirect_uri 불일치(KOE006) 발생
  // → 대표 도메인(APP_ORIGIN 또는 Netlify 제공 URL) 우선 사용
  const origin = process.env.APP_ORIGIN ?? process.env.URL ?? req.nextUrl.origin;

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return NextResponse.redirect(`${origin}/${locale}#kakaoError=NO_KAKAO_KEY`);
  }

  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", key);
  url.searchParams.set("redirect_uri", `${origin}/api/auth/kakao/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", locale);
  return NextResponse.redirect(url);
}
