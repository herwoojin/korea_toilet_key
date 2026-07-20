import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/errors";
import {
  fetchSheetPins,
  isSheetsConfigured,
  postToSheet,
  requireUidViaRest,
  rowToBuilding,
} from "@/lib/server/sheets";
import { distanceM, REGISTER_RADIUS_M } from "@/lib/geo";

export const runtime = "nodejs";

/**
 * 핀 저장소 API — Google Sheets(Apps Script Web App) 백엔드
 * firebase-admin을 쓰지 않으므로 Netlify 함수에서 서비스 계정 키가 필요 없다.
 */

/** 핀 전체 목록 → Building[] — 같은 위치 중복 등록 시 맞아요 많은 순이 위로 */
export async function GET() {
  try {
    if (!isSheetsConfigured) throw new ApiError(503, "NO_SHEETS");
    const pins = await fetchSheetPins();
    // 카운트는 첫 성별 토일렛에 실려 있음 (rowToBuilding 참고)
    const votes = (x: (typeof pins)[number]) => Number(x.correctCount) || 0;
    const buildings = [...pins]
      .sort((a, b) => {
        if (votes(b) !== votes(a)) return votes(b) - votes(a);
        return Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt)) || 0;
      })
      .map(rowToBuilding);
    return NextResponse.json({ buildings });
  } catch (e) {
    return handleApiError(e);
  }
}

/** 핀 등록 — 로그인 + 실제 GPS 반경 50m 검증 */
export async function POST(req: Request) {
  try {
    if (!isSheetsConfigured) throw new ApiError(503, "NO_SHEETS");
    const uid = await requireUidViaRest(req);
    const body = (await req.json()) as {
      name?: string;
      storeName?: string;
      address?: string;
      lat?: number;
      lng?: number;
      malePw?: string;
      femalePw?: string;
      nickname?: string;
      gpsLat?: number;
      gpsLng?: number;
    };

    const malePw = body.malePw?.trim() ?? "";
    const femalePw = body.femalePw?.trim() ?? "";
    if (
      !body.name?.trim() ||
      typeof body.lat !== "number" ||
      typeof body.lng !== "number" ||
      (!malePw && !femalePw)
    ) {
      throw new ApiError(400, "BAD_REQUEST");
    }
    if (
      typeof body.gpsLat !== "number" ||
      typeof body.gpsLng !== "number" ||
      distanceM(body.gpsLat, body.gpsLng, body.lat, body.lng) > REGISTER_RADIUS_M
    ) {
      throw new ApiError(403, "TOO_FAR");
    }

    const result = await postToSheet({
      action: "add",
      pin: {
        name: body.name.trim(),
        storeName: body.storeName?.trim() ?? "",
        address: body.address?.trim() ?? "",
        lat: body.lat,
        lng: body.lng,
        malePw,
        femalePw,
        nickname: body.nickname?.trim() || "user",
        uid,
      },
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    return handleApiError(e);
  }
}

/** 맞아요/틀려요 피드백(1인 1회) 또는 열람 카운트(view) 증가 */
export async function PATCH(req: Request) {
  try {
    if (!isSheetsConfigured) throw new ApiError(503, "NO_SHEETS");
    const uid = await requireUidViaRest(req);
    const body = (await req.json()) as { id?: string; result?: string; view?: boolean };
    if (!body.id) throw new ApiError(400, "BAD_REQUEST");

    // 열람(관심) 클릭 — 포인트 산정용 views 증가
    if (body.view) {
      await postToSheet({ action: "view", id: body.id });
      return NextResponse.json({ ok: true });
    }

    if (body.result !== "correct" && body.result !== "wrong") {
      throw new ApiError(400, "BAD_REQUEST");
    }
    try {
      await postToSheet({ action: "feedback", id: body.id, result: body.result, uid });
    } catch (e) {
      if (e instanceof ApiError && e.detail === "ALREADY_VOTED") {
        throw new ApiError(409, "ALREADY_VOTED");
      }
      throw e;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

// ── 관리자 전용 (헤더의 관리자 로그인: admin / 2525) ──
const ADMIN_ID = "admin";
const ADMIN_PW = "2525";

function requireAdmin(body: { adminId?: string; adminPw?: string }) {
  if (body.adminId !== ADMIN_ID || body.adminPw !== ADMIN_PW) {
    throw new ApiError(403, "NOT_ADMIN");
  }
}

/** 관리자 — 핀 삭제 */
export async function DELETE(req: Request) {
  try {
    if (!isSheetsConfigured) throw new ApiError(503, "NO_SHEETS");
    const body = (await req.json()) as { id?: string; adminId?: string; adminPw?: string };
    requireAdmin(body);
    if (!body.id) throw new ApiError(400, "BAD_REQUEST");
    await postToSheet({ action: "delete", id: body.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

/** 관리자 — 핀 수정 (건물명/점포명/남녀 비번) */
export async function PUT(req: Request) {
  try {
    if (!isSheetsConfigured) throw new ApiError(503, "NO_SHEETS");
    const body = (await req.json()) as {
      id?: string;
      adminId?: string;
      adminPw?: string;
      fields?: { name?: string; storeName?: string; malePw?: string; femalePw?: string };
    };
    requireAdmin(body);
    if (!body.id || !body.fields) throw new ApiError(400, "BAD_REQUEST");
    await postToSheet({ action: "update", id: body.id, fields: body.fields });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
