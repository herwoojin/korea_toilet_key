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

/** 핀 전체 목록 → Building[] */
export async function GET() {
  try {
    if (!isSheetsConfigured) throw new ApiError(503, "NO_SHEETS");
    const pins = await fetchSheetPins();
    return NextResponse.json({ buildings: pins.map(rowToBuilding) });
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

/** 맞아요/틀려요 피드백 — 1인 1회, 해당 핀의 카운트 증가 */
export async function PATCH(req: Request) {
  try {
    if (!isSheetsConfigured) throw new ApiError(503, "NO_SHEETS");
    const uid = await requireUidViaRest(req);
    const body = (await req.json()) as { id?: string; result?: string };
    if (!body.id || (body.result !== "correct" && body.result !== "wrong")) {
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
