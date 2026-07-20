"use client";

import { Loader2 } from "lucide-react";

/**
 * 서버(구글시트) 연동 중 팝업 — 로딩이 0.25초 이상 걸릴 때만 서서히 나타나
 * 캐시 히트 같은 즉시 응답에서는 깜빡이지 않는다 (CSS animation-delay).
 */
export default function SyncOverlay({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="sync-overlay-card flex items-center gap-3 rounded-2xl bg-slate-900/85 px-5 py-4 text-white shadow-2xl backdrop-blur">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span className="text-base font-medium">{text}</span>
      </div>
    </div>
  );
}
