import os from "os";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Level = "ok" | "warn" | "danger" | "critical";

function levelOf(worstPercent: number): Level {
  if (worstPercent >= 95) return "critical";
  if (worstPercent >= 85) return "danger";
  if (worstPercent >= 70) return "warn";
  return "ok";
}

/**
 * 서버 용량 신호등 헬스 엔드포인트 (공통 규칙)
 * 절대 이 엔드포인트로 인해 서버가 다운되면 안 됨 — try/catch 필수.
 * 메모리는 프로세스 RSS ÷ 예산(SERVER_MEMORY_BUDGET_MB, 서버리스 512~1024MB 가정) 기준.
 */
export async function GET() {
  try {
    const budgetMB = Number(process.env.SERVER_MEMORY_BUDGET_MB || 1024);
    const usedMB = process.memoryUsage().rss / 1024 / 1024;
    const memPercent = Math.min(100, (usedMB / budgetMB) * 100);

    const cores = os.cpus()?.length || 1;
    const load1m = os.loadavg()?.[0] ?? 0;
    const cpuPercent = Math.min(100, (load1m / cores) * 100);

    const worst = Math.max(memPercent, cpuPercent);
    const level = levelOf(worst);

    return NextResponse.json({
      ok: true,
      uptimeSec: Math.round(process.uptime()),
      memory: {
        usedMB: Math.round(usedMB),
        totalMB: budgetMB,
        percent: Math.round(memPercent * 10) / 10,
      },
      cpuLoad1m: Math.round(load1m * 100) / 100,
      disk: null,
      level,
      reason: level === "ok" ? "" : memPercent >= cpuPercent ? "memory" : "cpu",
    });
  } catch {
    return NextResponse.json({
      ok: false,
      uptimeSec: 0,
      memory: null,
      cpuLoad1m: null,
      disk: null,
      level: "critical",
      reason: "health_check_failed",
    });
  }
}
