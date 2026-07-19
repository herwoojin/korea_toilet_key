"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { toMillis, type Confidence } from "@/types/building";

interface Props {
  confidence: Confidence;
  reportCount?: number;
  lastConfirmedAt?: unknown;
  compact?: boolean;
}

const VARIANT: Record<Confidence, "success" | "warning" | "secondary"> = {
  high: "success",
  medium: "warning",
  low: "secondary",
};

/** 신뢰도 등급 + 근거(제보 n건 · 최근 확인 n일 전) 표시 (FR-11, T-106) */
export default function ConfidenceBadge({
  confidence,
  reportCount,
  lastConfirmedAt,
  compact,
}: Props) {
  const t = useTranslations("building");
  const confirmedMs = toMillis(lastConfirmedAt);
  const days =
    confirmedMs != null
      ? Math.max(0, Math.floor((Date.now() - confirmedMs) / 86_400_000))
      : null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={VARIANT[confidence]}>{t(`confidence.${confidence}`)}</Badge>
      {!compact && (
        <span className="text-xs text-muted-foreground">
          {reportCount != null && reportCount > 0 && t("reports", { count: reportCount })}
          {days != null && <> · {t("lastConfirmed", { days })}</>}
        </span>
      )}
    </span>
  );
}
