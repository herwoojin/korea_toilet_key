import { describe, expect, it } from "vitest";
import { computeConsensus, recencyWeight, type ConsensusReport } from "./consensus";

const NOW = new Date("2026-07-19T12:00:00+09:00");

function report(
  password: string,
  daysAgo: number,
  opts: Partial<ConsensusReport> = {}
): ConsensusReport {
  return {
    password,
    reportedAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
    reporterVerified: false,
    onsite: false,
    ...opts,
  };
}

describe("recencyWeight", () => {
  it("30일 이내 1.0, 180일 이상 0.3, 사이는 선형감쇠", () => {
    expect(recencyWeight(0)).toBe(1.0);
    expect(recencyWeight(30)).toBe(1.0);
    expect(recencyWeight(180)).toBe(0.3);
    expect(recencyWeight(300)).toBe(0.3);
    expect(recencyWeight(105)).toBeCloseTo(0.65, 5);
  });
});

describe("computeConsensus", () => {
  it("다수결: 5명이 제보한 값이 1명이 제보한 값을 이긴다", () => {
    const reports = [
      ...Array.from({ length: 5 }, () => report("1234", 1)),
      report("5678", 1),
    ];
    const r = computeConsensus(reports, [], null, NOW);
    expect(r.current).toBe("1234");
    expect(r.confidence).toBe("high"); // score 5.0
  });

  it("최신성 감쇠: 오래된 다수보다 최근 소수가 이길 수 있다", () => {
    const reports = [
      report("old0", 200), // 0.3
      report("old0", 200), // 0.3 → 합 0.6
      report("new1", 1), // 1.0
    ];
    const r = computeConsensus(reports, [], null, NOW);
    expect(r.current).toBe("new1");
  });

  it("인증(1.5)·현장(1.3) 가중치가 곱해진다", () => {
    const reports = [
      report("a", 1, { reporterVerified: true, onsite: true }), // 1.95
      report("b", 1),
      report("b", 1), // 합 2.0 → b 승리
    ];
    const r = computeConsensus(reports, [], null, NOW);
    expect(r.current).toBe("b");
    expect(r.candidates.find((c) => c.value === "a")?.score).toBeCloseTo(1.95, 2);
  });

  it("틀렸어요 누적 시 점수 하락으로 등급이 떨어진다", () => {
    const reports = [report("1234", 1), report("1234", 1)]; // 2.0 → medium
    const ok = computeConsensus(reports, [], null, NOW);
    expect(ok.confidence).toBe("medium");
    const bad = computeConsensus(
      reports,
      [{ password: "1234", result: "wrong" }],
      null,
      NOW
    ); // 1.0 → low
    expect(bad.confidence).toBe("low");
  });

  it("맞았어요는 +0.5 보정된다", () => {
    const r = computeConsensus(
      [report("1234", 1)],
      [{ password: "1234", result: "correct" }],
      null,
      NOW
    );
    expect(r.candidates[0].score).toBeCloseTo(1.5, 2);
  });

  it("오너 오버라이드는 점수와 무관하게 최우선이다", () => {
    const reports = Array.from({ length: 10 }, () => report("9999", 1));
    const r = computeConsensus(reports, [], "0000", NOW);
    expect(r.current).toBe("0000");
    expect(r.confidence).toBe("high");
  });

  it("유효 제보가 없으면 current는 null", () => {
    const r = computeConsensus([report("1", 1, { revoked: true })], [], null, NOW);
    expect(r.current).toBeNull();
    expect(r.confidence).toBe("low");
  });
});
