/**
 * 신뢰도 합의 알고리즘 (TRD §3.4) — 부수효과 없는 순수함수
 *
 * score(후보) = Σ 제보별 [ W_base(1.0)
 *                 × W_recency(최근 30일 1.0 → 180일 0.3 선형감쇠)
 *                 × W_reporter(본인인증 1.5 / 일반 1.0)
 *                 × W_onsite(현장 제보 1.3 / 원격 1.0) ]
 *               + 피드백 보정(맞았어요 +0.5, 틀렸어요 −1.0)
 * 오너 공식 등록 존재 시 → 무조건 오너 값이 대표값
 */

export type ConsensusConfidence = "high" | "medium" | "low";

export interface ConsensusReport {
  password: string;
  reportedAt: Date;
  reporterVerified: boolean;
  onsite: boolean;
  revoked?: boolean;
}

export interface ConsensusFeedback {
  /** 피드백 대상 후보 비밀번호 (viewLog.revealedValue 스냅샷) */
  password: string;
  result: "correct" | "wrong";
}

export interface Candidate {
  value: string;
  score: number;
}

export interface ConsensusResult {
  current: string | null;
  candidates: Candidate[];
  confidence: ConsensusConfidence;
}

const DAY_MS = 86_400_000;

export function recencyWeight(ageDays: number): number {
  if (ageDays <= 30) return 1.0;
  if (ageDays >= 180) return 0.3;
  return 1.0 - ((ageDays - 30) / 150) * 0.7;
}

export function computeConsensus(
  reports: ConsensusReport[],
  feedbacks: ConsensusFeedback[],
  ownerOverride?: string | null,
  now: Date = new Date()
): ConsensusResult {
  const scores = new Map<string, number>();

  for (const r of reports) {
    if (r.revoked) continue;
    const ageDays = Math.max(0, (now.getTime() - r.reportedAt.getTime()) / DAY_MS);
    const w =
      1.0 *
      recencyWeight(ageDays) *
      (r.reporterVerified ? 1.5 : 1.0) *
      (r.onsite ? 1.3 : 1.0);
    scores.set(r.password, (scores.get(r.password) ?? 0) + w);
  }

  for (const f of feedbacks) {
    if (!scores.has(f.password)) continue;
    scores.set(
      f.password,
      (scores.get(f.password) ?? 0) + (f.result === "correct" ? 0.5 : -1.0)
    );
  }

  const candidates: Candidate[] = [...scores.entries()]
    .map(([value, score]) => ({ value, score: Math.round(score * 100) / 100 }))
    .sort((a, b) => b.score - a.score);

  if (ownerOverride) {
    return { current: ownerOverride, candidates, confidence: "high" };
  }

  const top = candidates[0];
  if (!top || top.score <= 0) {
    return { current: null, candidates, confidence: "low" };
  }
  const confidence: ConsensusConfidence =
    top.score >= 5 ? "high" : top.score >= 2 ? "medium" : "low";
  return { current: top.value, candidates, confidence };
}
