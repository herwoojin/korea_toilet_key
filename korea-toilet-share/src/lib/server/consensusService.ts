import { FieldValue, type Firestore } from "firebase-admin/firestore";
import {
  computeConsensus,
  type ConsensusFeedback,
  type ConsensusReport,
} from "@/lib/consensus";
import type { Gender } from "@/types/building";

/**
 * 제보/피드백 발생 시 대표 비밀번호 재계산 (TRD §3.4)
 * → secrets/{buildingId}.{gender} 갱신 + buildings 캐시 필드 갱신 (읽기 비용 절감)
 */
export async function recomputeConsensus(
  db: Firestore,
  buildingId: string,
  gender: Gender
): Promise<void> {
  const [reportsSnap, feedbacksSnap, secretSnap] = await Promise.all([
    db
      .collection("reports")
      .where("buildingId", "==", buildingId)
      .where("gender", "==", gender)
      .get(),
    db
      .collection("feedbacks")
      .where("buildingId", "==", buildingId)
      .where("gender", "==", gender)
      .get(),
    db.doc(`secrets/${buildingId}`).get(),
  ]);

  const reports: ConsensusReport[] = reportsSnap.docs.map((d) => {
    const r = d.data();
    return {
      password: String(r.password),
      reportedAt: r.reportedAt?.toDate?.() ?? new Date(0),
      reporterVerified: Boolean(r.reporterVerified),
      onsite: Boolean(r.onsite),
      revoked: Boolean(r.revoked),
    };
  });

  const feedbacks: ConsensusFeedback[] = feedbacksSnap.docs
    .filter((d) => typeof d.data().password === "string")
    .map((d) => ({
      password: String(d.data().password),
      result: d.data().result === "wrong" ? "wrong" : "correct",
    }));

  const ownerOverride =
    (secretSnap.data()?.ownerOverride?.[gender] as string | undefined) ?? null;

  const result = computeConsensus(reports, feedbacks, ownerOverride);

  await db.doc(`secrets/${buildingId}`).set(
    {
      [gender]: { current: result.current, candidates: result.candidates },
      computedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const activeCount = reports.filter((r) => !r.revoked).length;
  await db.doc(`buildings/${buildingId}`).set(
    {
      toilets: {
        [gender]: {
          exists: true,
          hasPassword: result.current != null,
          confidence: result.confidence,
          reportCount: activeCount,
        },
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
