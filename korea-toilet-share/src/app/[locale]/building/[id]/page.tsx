"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import ToiletCard from "@/components/building/ToiletCard";
import { fetchBuilding } from "@/lib/buildings";
import { toMillis, type Building } from "@/types/building";

/** 빌딩 상세 (T-106) */
export default function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("building");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBuilding(id)
      .then((b) => {
        if (!cancelled) setBuilding(b);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p className="p-6 text-center text-sm text-muted-foreground">{tCommon("loading")}</p>;
  }
  if (!building) {
    return <p className="p-6 text-center text-sm text-muted-foreground">{tCommon("notFound")}</p>;
  }

  const updatedMs = toMillis(building.updatedAt);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{building.name}</h1>
          {building.ownerVerified && <Badge variant="success">{t("ownerVerified")}</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{building.address}</p>
        {updatedMs != null && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("updated")}: {format.dateTime(new Date(updatedMs), { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>

      {building.status === "disputed" && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">{t("disputed")}</p>
      )}

      <ToiletCard building={building} gender="male" />
      <ToiletCard building={building} gender="female" />
    </div>
  );
}
