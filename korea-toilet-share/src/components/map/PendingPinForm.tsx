"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

export interface PendingPinFields {
  buildingName: string;
  storeName: string;
  malePw: string;
  femalePw: string;
}

interface Props {
  address: string | null;
  suggestedName: string | null;
  busy: boolean;
  serverError?: string | null;
  onSubmit: (fields: PendingPinFields) => void;
  onCancel: () => void;
}

/** 지도 클릭 지점 핀 등록 폼 — 참조 디자인(오렌지 카드) 기반 */
export default function PendingPinForm({
  address,
  suggestedName,
  busy,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const t = useTranslations("pin");
  const [buildingName, setBuildingName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [malePw, setMalePw] = useState("");
  const [femalePw, setFemalePw] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 역지오코딩으로 건물명이 오면 비어 있을 때만 자동 채움
  useEffect(() => {
    if (suggestedName) {
      setBuildingName((prev) => (prev ? prev : suggestedName));
    }
  }, [suggestedName]);

  function submit() {
    if (!buildingName.trim()) {
      setError(t("needBuildingName"));
      return;
    }
    if (!malePw.trim() && !femalePw.trim()) {
      setError(t("needAnyPw"));
      return;
    }
    setError(null);
    onSubmit({
      buildingName: buildingName.trim(),
      storeName: storeName.trim(),
      malePw: malePw.trim(),
      femalePw: femalePw.trim(),
    });
  }

  const inputCls =
    "w-full rounded border border-orange-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-300";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-xl sm:flex-row sm:items-start">
      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-orange-800">{t("question")}</p>
        <p className="mt-0.5 truncate text-xs text-orange-600">
          {address ?? t("addressLoading")}
        </p>
        <input
          className={`mt-2 ${inputCls}`}
          placeholder={t("buildingName")}
          value={buildingName}
          onChange={(e) => setBuildingName(e.target.value)}
        />
        <input
          className={`mt-2 ${inputCls}`}
          placeholder={t("storeName")}
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className={inputCls}
            placeholder={t("malePw")}
            value={malePw}
            onChange={(e) => setMalePw(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder={t("femalePw")}
            value={femalePw}
            onChange={(e) => setFemalePw(e.target.value)}
          />
        </div>
        {(error ?? serverError) && (
          <p className="mt-2 text-xs text-destructive">{error ?? serverError}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          onClick={submit}
          disabled={busy}
        >
          {t("add")}
        </button>
        <button
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          onClick={onCancel}
          disabled={busy}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
