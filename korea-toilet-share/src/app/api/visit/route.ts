import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/errors";
import { fetchVisitStats, isSheetsConfigured, postToSheet } from "@/lib/server/sheets";

export const runtime = "nodejs";

/**
 * 방문자 카운터 — 구글시트 stats 탭 연동.
 * body.count=true면 오늘/누적 +1 후 반환, 아니면 현재 값만 반환.
 */
export async function POST(req: Request) {
  try {
    if (!isSheetsConfigured) throw new ApiError(503, "NO_SHEETS");
    const body = (await req.json().catch(() => ({}))) as { count?: boolean };
    if (body.count) {
      const data = (await postToSheet({ action: "visit" })) as {
        ok: boolean;
        today?: number;
        total?: number;
      };
      return NextResponse.json({
        today: Number(data.today) || 0,
        total: Number(data.total) || 0,
      });
    }
    const stats = await fetchVisitStats();
    return NextResponse.json(stats);
  } catch (e) {
    return handleApiError(e);
  }
}
