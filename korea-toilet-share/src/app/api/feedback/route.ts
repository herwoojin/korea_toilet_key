import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { ApiError, handleApiError, requireUid } from "@/lib/server/api";
import { recomputeConsensus } from "@/lib/server/consensusService";

export const runtime = "nodejs";

const FEEDBACK_POINTS = 2;

/**
 * 맞았어요/틀렸어요 피드백 (T-206)
 * feedbacks 저장(+당시 revealedValue 스냅샷) → 합의 재계산(+0.5/−1.0 보정 반영)
 */
export async function POST(req: Request) {
  try {
    const uid = await requireUid(req);
    const body = (await req.json()) as {
      viewLogId?: string;
      result?: "correct" | "wrong";
    };
    if (!body.viewLogId || (body.result !== "correct" && body.result !== "wrong")) {
      throw new ApiError(400, "BAD_REQUEST");
    }

    const db = getAdminDb();
    const logSnap = await db.doc(`viewLogs/${body.viewLogId}`).get();
    if (!logSnap.exists) throw new ApiError(404, "NOT_FOUND");
    const log = logSnap.data()!;
    if (log.viewerId !== uid) throw new ApiError(403, "FORBIDDEN");

    const gender = log.gender as "male" | "female";
    const buildingId = log.buildingId as string;

    await db.collection("feedbacks").add({
      buildingId,
      gender,
      viewLogId: body.viewLogId,
      userId: uid,
      result: body.result,
      // 합의 보정 대상 후보를 특정하기 위한 당시 표시값 스냅샷
      password: log.revealedValue ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    await recomputeConsensus(db, buildingId, gender);

    if (body.result === "correct") {
      await db.doc(`buildings/${buildingId}`).set(
        { toilets: { [gender]: { lastConfirmedAt: FieldValue.serverTimestamp() } } },
        { merge: true }
      );
    }

    await db.doc(`users/${uid}`).update({
      points: FieldValue.increment(FEEDBACK_POINTS),
      lastActiveAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
