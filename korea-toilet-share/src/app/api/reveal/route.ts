import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError, handleApiError, requireUid } from "@/lib/server/api";
import { distanceM } from "@/lib/geo";

export const runtime = "nodejs";

const REVEAL_POINT_COST = 5;

/**
 * ★ 비밀번호 열람 API (T-204, PROMPT.md 최중요)
 * ① ID 토큰 검증 ② 에티켓 서약 확인 ③ freeReveals/points 잔액 확인
 * ④ 트랜잭션으로 viewLogs 기록 (실패 시 비밀번호 절대 미반환)
 * ⑤ secrets에서 대표값 반환 (ownerOverride 최우선)
 */
export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const body = (await req.json()) as {
      buildingId?: string;
      gender?: "male" | "female";
      lat?: number;
      lng?: number;
    };
    const { buildingId, gender } = body;
    if (!buildingId || (gender !== "male" && gender !== "female")) {
      throw new ApiError(400, "BAD_REQUEST");
    }

    const db = getAdminDb();

    const result = await db.runTransaction(async (tx) => {
      const userRef = db.doc(`users/${uid}`);
      const [userSnap, buildingSnap, secretSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(db.doc(`buildings/${buildingId}`)),
        tx.get(db.doc(`secrets/${buildingId}`)),
      ]);

      if (!userSnap.exists) throw new ApiError(403, "NO_USER_DOC");
      const user = userSnap.data()!;
      if (!user.etiquetteAgreedAt) throw new ApiError(403, "ETIQUETTE_REQUIRED");

      if (!buildingSnap.exists) throw new ApiError(404, "NOT_FOUND");
      const building = buildingSnap.data()!;
      if (building.status === "disputed") throw new ApiError(409, "DISPUTED");
      if (building.status === "hidden") throw new ApiError(404, "NOT_FOUND");

      const secret = secretSnap.data() ?? {};
      const ownerValue = secret.ownerOverride?.[gender] as string | undefined;
      const value = ownerValue ?? (secret[gender]?.current as string | undefined);
      if (!value) throw new ApiError(404, "NO_PASSWORD");

      // 잔액 확인: freeReveals 우선 차감, 없으면 points 5p (T-402)
      const freeReveals = Number(user.freeReveals ?? 0);
      const points = Number(user.points ?? 0);
      let credit: Record<string, number>;
      if (freeReveals > 0) credit = { freeReveals: freeReveals - 1 };
      else if (points >= REVEAL_POINT_COST) credit = { points: points - REVEAL_POINT_COST };
      else throw new ApiError(402, "NO_CREDIT");

      const dist =
        typeof body.lat === "number" && typeof body.lng === "number"
          ? distanceM(body.lat, body.lng, building.lat, building.lng)
          : null;

      // 열람 로그 (ERD §2.5) — 로그 기록과 차감이 같은 트랜잭션
      const logRef = db.collection("viewLogs").doc();
      tx.create(logRef, {
        buildingId,
        buildingName: building.name ?? null,
        gender,
        viewerId: uid,
        viewerNickname: user.nickname ?? "user",
        viewerPhoneVerified: Boolean(user.phoneVerified),
        viewedAt: FieldValue.serverTimestamp(),
        viewerLat: body.lat ?? null,
        viewerLng: body.lng ?? null,
        distanceM: dist,
        revealedValue: value,
      });
      tx.update(userRef, { ...credit, lastActiveAt: FieldValue.serverTimestamp() });

      // 실시간 공유 피드 — 민감정보(비밀번호·GPS) 제외 스냅샷 (공개 read)
      tx.create(db.collection("liveFeed").doc(), {
        buildingId,
        buildingName: building.name ?? null,
        gender,
        viewerNickname: user.nickname ?? "user",
        viewedAt: FieldValue.serverTimestamp(),
      });

      return {
        password: value,
        viewLogId: logRef.id,
        source: ownerValue ? "owner" : "consensus",
        confidence: building.toilets?.[gender]?.confidence ?? "low",
        freeRevealsLeft: credit.freeReveals ?? freeReveals,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
