"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ConfidenceBadge from "./ConfidenceBadge";
import RevealButton from "./RevealButton";
import type { Building, Gender } from "@/types/building";

interface Props {
  building: Building;
  gender: Gender;
}

/** 남/여 화장실 카드 — 위치 설명·잠금·신뢰도·열람 버튼 (T-106) */
export default function ToiletCard({ building, gender }: Props) {
  const t = useTranslations("building");
  const toilet = building.toilets?.[gender];
  const disputed = building.status === "disputed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {t(gender)}
          {toilet?.exists && (
            <Badge variant={toilet.hasPassword ? "secondary" : "success"}>
              {toilet.hasPassword ? t("locked") : t("unlocked")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!toilet?.exists ? (
          <p className="text-sm text-muted-foreground">{t("noToilet")}</p>
        ) : (
          <>
            {toilet.locationDesc && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("location")}: </span>
                {toilet.locationDesc}
              </p>
            )}
            {toilet.confidence && (
              <ConfidenceBadge
                confidence={toilet.confidence}
                reportCount={toilet.reportCount}
                lastConfirmedAt={toilet.lastConfirmedAt}
              />
            )}
            {toilet.hasPassword &&
              (disputed ? (
                <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  {t("disputed")}
                </p>
              ) : (
                <RevealButton building={building} gender={gender} />
              ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
