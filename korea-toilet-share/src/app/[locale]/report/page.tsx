"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 비밀번호 제보 안내 — 제보는 지도 화면의 핀 등록으로 일원화됨 (구글시트 저장).
 * 이 페이지는 사용 방법을 안내하고 지도로 보내는 역할만 한다.
 */
export default function ReportPage() {
  const t = useTranslations("report");

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden />
            <p className="text-sm leading-relaxed">{t("mapGuide")}</p>
          </div>

          <ol className="list-decimal space-y-2 pl-9 text-sm text-muted-foreground">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>

          <Button asChild className="w-full">
            <Link href="/">
              <MapPin className="h-4 w-4" />
              {t("goMap")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="rounded-md bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800">
        {t("syncNote")}
      </p>
    </div>
  );
}
