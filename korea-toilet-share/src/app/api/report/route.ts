import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError, handleApiError, requireUid } from "@/lib/server/api";
import {
  computeGeohash,
  distanceM,
  ONSITE_THRESHOLD_M,
  REGISTER_RADIUS_M,
} from "@/lib/geo";
import { recomputeConsensus } from "@/lib/server/consensusService";

export const runtime = "nodejs";

const REPORT_POINTS = 10;

/** 등록 위치 제한 — 제보자의 실제 GPS가 대상 빌딩 반경 50m 안이어야 한다 */
function ensureNear(
  gpsLat: number | undefined,
  gpsLng: number | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined
) {
  if (
    typeof gpsLat !== "number" ||
    typeof gpsLng !== "number" ||
    lat == null ||
    lng == null ||
    distanceM(gpsLat, gpsLng, lat, lng) > REGISTER_RADIUS_M
  ) {
    throw new ApiError(403, "TOO_FAR");
  }
}

/**
 * 비밀번호 제보 API (T-303)
 * reports 저장(불변) → onsite 판정(GPS 150m) → 합의 재계산 → secrets/buildings 캐시 갱신 → +10p
 */
export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const body = (await req.json()) as {
      buildingId?: string;
      newBuilding?: {
        name: string;
        storeName?: string;
        address: string;
        lat: number;
        lng: number;
      };
      gender?: "male" | "female";
      password?: string;
      /** 지도 핀 등록 플로우 — 남/여 비번 동시 제보 */
      passwords?: { male?: string; female?: string };
      locationDesc?: string;
      gpsLat?: number;
      gpsLng?: number;
    };

    // 제보 엔트리 정규화: passwords(신규 핀 플로우) 또는 gender+password(기존 플로우)
    const entries: { gender: "male" | "female"; password: string }[] = [];
    if (body.passwords) {
      if (body.passwords.male?.trim())
        entries.push({ gender: "male", password: body.passwords.male.trim() });
      if (body.passwords.female?.trim())
        entries.push({ gender: "female", password: body.passwords.female.trim() });
    } else if (
      (body.gender === "male" || body.gender === "female") &&
      body.password?.trim()
    ) {
      entries.push({ gender: body.gender, password: body.password.trim() });
    }
    if (entries.length === 0) throw new ApiError(400, "BAD_REQUEST");

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
      ensureNear(body.gpsLat, body.gpsLng, buildingLat, buildingLng);
    } else if (body.newBuilding) {
      const nb = body.newBuilding;
      if (!nb.address || typeof nb.lat !== "number" || typeof nb.lng !== "number") {
        throw new ApiError(400, "BAD_REQUEST");
      }
      // 빌딩 생성 전에 거리 검증 (고아 문서 방지)
      ensureNear(body.gpsLat, body.gpsLng, nb.lat, nb.lng);
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
          storeName: nb.storeName?.trim() || null,
          address: nb.address,
          lat: nb.lat,
          lng: nb.lng,
          geohash: computeGeohash(nb.lat, nb.lng),
          toilets: {
            male: { exists: entries.some((e) => e.gender === "male"), hasPassword: false },
            female: { exists: entries.some((e) => e.gender === "female"), hasPassword: false },
          },
          ownerVerified: false,
          isPublicByOwner: false,
          status: "active",
          createdBy: uid,
          createdByNickname: user.nickname ?? "user",
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

    // 제보 저장 (ERD §2.4, 불변 로그) — 성별별 개별 report
    for (const entry of entries) {
      await db.collection("reports").add({
        buildingId,
        gender: entry.gender,
        password: entry.password,
        reporterId: uid,
        reporterVerified: Boolean(user.phoneVerified),
        onsite,
        reportedAt: FieldValue.serverTimestamp(),
        revoked: false,
      });
      if (body.locationDesc?.trim()) {
        await db.doc(`buildings/${buildingId}`).set(
          { toilets: { [entry.gender]: { locationDesc: body.locationDesc.trim() } } },
          { merge: true }
        );
      }
      await recomputeConsensus(db, buildingId, entry.gender);
    }

    // 기존 빌딩에 점포명이 새로 제공되면 반영
    if (body.newBuilding?.storeName?.trim()) {
      await db.doc(`buildings/${buildingId}`).set(
        { storeName: body.newBuilding.storeName.trim() },
        { merge: true }
      );
    }

    await db.doc(`users/${uid}`).update({
      points: FieldValue.increment(REPORT_POINTS * entries.length),
      lastActiveAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, buildingId, onsite });
  } catch (e) {
    return handleApiError(e);
  }
}
