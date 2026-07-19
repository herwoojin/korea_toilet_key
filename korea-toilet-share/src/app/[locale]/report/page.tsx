"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LoginSheet from "@/components/common/LoginSheet";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Gender } from "@/types/building";

interface GeocodeResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** 비밀번호 제보 화면 (T-302) — 주소 검색 → 위치 선택 → 남/여 비밀번호 입력 */
export default function ReportPage() {
  const t = useTranslations("report");
  const tBuilding = useTranslations("building");
  const tPin = useTranslations("pin");
  const { user, configured } = useAuth();

  const [loginOpen, setLoginOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [buildingName, setBuildingName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [password, setPassword] = useState("");
  const [locationDesc, setLocationDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function search() {
    setSearchError(null);
    setResults([]);
    if (!q.trim()) return;
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
    if (res.status === 503) {
      setSearchError(t("needSetup"));
      return;
    }
    const data = (await res.json()) as { results?: GeocodeResult[] };
    setResults(data.results ?? []);
  }

  async function submit() {
    if (!user || !selected || !password.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const gps = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!("geolocation" in navigator)) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { timeout: 4000 }
        );
      });
      const token = await user.getIdToken();
      const res = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newBuilding: {
            name: buildingName.trim() || selected.name,
            address: selected.address,
            lat: selected.lat,
            lng: selected.lng,
          },
          gender,
          password: password.trim(),
          locationDesc: locationDesc.trim() || undefined,
          gpsLat: gps?.lat,
          gpsLng: gps?.lng,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setMessage({
          ok: false,
          text: data?.error === "TOO_FAR" ? tPin("tooFar") : t("error"),
        });
        return;
      }
      setMessage({ ok: true, text: t("success") });
      setPassword("");
      setLocationDesc("");
    } catch {
      setMessage({ ok: false, text: t("error") });
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <h1 className="mb-3 text-xl font-bold">{t("title")}</h1>
        <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">{t("needSetup")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-4">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("loginFirst")}</p>
        <Button onClick={() => setLoginOpen(true)}>{t("loginFirst")}</Button>
        <LoginSheet open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("searchLabel")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button size="icon" onClick={search} className="shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {searchError && <p className="text-sm text-destructive">{searchError}</p>}
          {results.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-md border">
              {results.map((r, i) => (
                <button
                  key={i}
                  className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
                  onClick={() => {
                    setSelected(r);
                    setBuildingName(r.name);
                    setResults([]);
                  }}
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-xs text-muted-foreground">{r.address}</span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t("selected")}: </span>
              {selected.address}
            </p>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("buildingName")}</label>
              <Input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("gender")}</label>
              <div className="flex gap-2">
                {(["male", "female"] as const).map((g) => (
                  <Button
                    key={g}
                    type="button"
                    variant={gender === g ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setGender(g)}
                  >
                    {tBuilding(g)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("password")}</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} inputMode="text" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("locationDesc")}</label>
              <Input value={locationDesc} onChange={(e) => setLocationDesc(e.target.value)} />
            </div>
            <Button className="w-full" onClick={submit} disabled={busy || !password.trim()}>
              {t("submit")}
            </Button>
            {message && (
              <p className={message.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>
                {message.text}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
