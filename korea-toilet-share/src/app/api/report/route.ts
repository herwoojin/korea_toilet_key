import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError, handleApiError, requireUid } from "@/lib/server/api";
import { computeGeohash, distanceM, ONSITE_THRESHOLD_M } from "@/lib/geo";
import { recomputeConsensus } from "@/lib/server/consensusService";

export const runtime = "nodejs";

const REPORT_POINTS = 10;

/**
 * 비밀번호 제보 API (T-303)
 * reports 저장(불변) → onsite 판정(GPS 150m) → 합의 재계산 → secrets/buildings 캐시 갱신 → +10p
 */
export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const body = (await req.json()) as {
      buildingId?: string;
      newBuilding?: { name: string; address: string; lat: number; lng: number };
      gender?: "male" | "female";
      password?: string;
      locationDesc?: string;
      gpsLat?: number;
      gpsLng?: number;
    };
    const { gender, password } = body;
    if ((gender !== "male" && gender !== "female") || !password?.trim()) {
      throw new ApiError(400, "BAD_REQUEST");
    }

    const db = getAdminDb();
    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) throw new ApiError(403, "NO_USER_DOC");
    const user = userSnap.data()!;

    // 빌딩 확정: 기존 ID 사용 / 동일 주소 재사용 / 신규 생성
    let buildingId = body.buildingId ?? null;
    let buildingLat: number | null = null;
    let buildingLng: number | null = null;

    if (buildingId) {
      const b = await db.doc(`buildings/${buildingId}`).get();
      if (!b.exists) throw new ApiError(404, "NOT_FOUND");
      buildingLat = b.data()!.lat;
      buildingLng = b.data()!.lng;
    } else if (body.newBuilding) {
      const nb = body.newBuilding;
      if (!nb.address || typeof nb.lat !== "number" || typeof nb.lng !== "number") {
        throw new ApiError(400, "BAD_REQUEST");
      }
      const dup = await db
        .collection("buildings")
        .where("address", "==", nb.address)
        .limit(1)
        .get();
      if (!dup.empty) {
        buildingId = dup.docs[0].id;
        buildingLat = dup.docs[0].data().lat;
        buildingLng = dup.docs[0].data().lng;
      } else {
        const ref = await db.collection("buildings").add({
          name: nb.name || nb.address,
          address: nb.address,
          lat: nb.lat,
          lng: nb.lng,
          geohash: computeGeohash(nb.lat, nb.lng),
          toilets: {
            male: { exists: gender === "male", hasPassword: false },
            female: { exists: gender === "female", hasPassword: false },
          },
          ownerVerified: false,
          isPublicByOwner: false,
          status: "active",
          createdBy: uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        buildingId = ref.id;
        buildingLat = nb.lat;
        buildingLng = nb.lng;
      }
    } else {
      throw new ApiError(400, "BAD_REQUEST");
    }

    const onsite =
      typeof body.gpsLat === "number" &&
      typeof body.gpsLng === "number" &&
      buildingLat != null &&
      buildingLng != null &&
      distanceM(body.gpsLat, body.gpsLng, buildingLat, buildingLng) <= ONSITE_THRESHOLD_M;

    // 제보 저장 (ERD §2.4, 불변 로그)
    await db.collection("reports").add({
      buildingId,
      gender,
      password: password.trim(),
      reporterId: uid,
      reporterVerified: Boolean(user.phoneVerified),
      onsite,
      reportedAt: FieldValue.serverTimestamp(),
      revoked: false,
    });

    if (body.locationDesc?.trim()) {
      await db.doc(`buildings/${buildingId}`).set(
        { toilets: { [gender]: { locationDesc: body.locationDesc.trim() } } },
        { merge: true }
      );
    }

    await recomputeConsensus(db, buildingId, gender);

    await db.doc(`users/${uid}`).update({
      points: FieldValue.increment(REPORT_POINTS),
      lastActiveAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, buildingId, onsite });
  } catch (e) {
    return handleApiError(e);
  }
}
