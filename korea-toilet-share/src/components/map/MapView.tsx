"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfidenceBadge from "@/components/building/ConfidenceBadge";
import { fetchNearbyBuildings } from "@/lib/buildings";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import type { LatLng } from "@/lib/map/MapProvider";
import type { Building } from "@/types/building";

const DEFAULT_CENTER: LatLng = { lat: 37.498095, lng: 127.02761 }; // 강남역
const FETCH_RADIUS_M = 1200;

// Leaflet 기본 아이콘 경로 문제 회피 — 브랜드 컬러 SVG 핀 (GUIDE §8)
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.7 23.3 0 15 0z" fill="#2563EB"/><circle cx="15" cy="14" r="6" fill="#fff"/></svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
});

interface GeocodeResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

function MapEvents({ onMoved }: { onMoved: (c: LatLng) => void }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      onMoved({ lat: c.lat, lng: c.lng });
    },
  });
  return null;
}

function PanTo({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], Math.max(map.getZoom(), 15));
  }, [map, center]);
  return null;
}

export default function MapView() {
  const t = useTranslations("map");
  const tApp = useTranslations("app");
  const tBuilding = useTranslations("building");

  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [viewCenter, setViewCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(c);
        setCenter(c);
        setGeoDenied(false);
      },
      () => setGeoDenied(true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 진입 시 GPS 시도 (T-102)
  useEffect(() => {
    locate();
  }, [locate]);

  // 지도 이동 시 주변 빌딩 재조회 (T-105)
  useEffect(() => {
    let cancelled = false;
    fetchNearbyBuildings(viewCenter.lat, viewCenter.lng, FETCH_RADIUS_M)
      .then((list) => {
        if (!cancelled) setBuildings(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [viewCenter]);

  async function search() {
    setSearchError(null);
    setResults([]);
    if (!q.trim()) return;
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
      if (res.status === 503) {
        setSearchError(t("searchNoKey"));
        return;
      }
      const data = (await res.json()) as { results?: GeocodeResult[] };
      if (!data.results?.length) {
        setSearchError(t("noResults"));
        return;
      }
      setResults(data.results);
    } catch {
      setSearchError(t("noResults"));
    }
  }

  const markers = useMemo(
    () =>
      buildings.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lng]}
          icon={pinIcon}
          eventHandlers={{ click: () => setSelected(b) }}
        />
      )),
    [buildings]
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={16}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMoved={setViewCenter} />
        <PanTo center={center} />
        {myLocation && (
          <CircleMarker
            center={[myLocation.lat, myLocation.lng]}
            radius={8}
            pathOptions={{ color: "#fff", fillColor: "#2563EB", fillOpacity: 1, weight: 3 }}
          />
        )}
        {markers}
      </MapContainer>

      {/* 상단: 검색 + 배너 */}
      <div className="absolute inset-x-3 top-3 z-[1001] space-y-2">
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder={t("searchPlaceholder")}
            className="bg-background/95 shadow"
          />
          <Button onClick={search} size="icon" className="shrink-0 shadow" aria-label={t("search")}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {results.length > 0 && (
          <div className="max-h-52 overflow-auto rounded-md border bg-background shadow">
            {results.map((r, i) => (
              <button
                key={i}
                className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
                onClick={() => {
                  setCenter({ lat: r.lat, lng: r.lng });
                  setResults([]);
                }}
              >
                <span className="font-medium">{r.name}</span>
                <span className="block text-xs text-muted-foreground">{r.address}</span>
              </button>
            ))}
          </div>
        )}
        {searchError && (
          <p className="rounded-md bg-background/95 px-3 py-2 text-xs text-destructive shadow">
            {searchError}
          </p>
        )}
        {geoDenied && (
          <p className="rounded-md bg-amber-50/95 px-3 py-2 text-xs text-amber-800 shadow">
            {t("geoDenied")}
          </p>
        )}
        {!isFirebaseConfigured && (
          <p className="rounded-md bg-blue-50/95 px-3 py-2 text-xs text-blue-800 shadow">
            {tApp("demoBanner")}
          </p>
        )}
      </div>

      {/* 우측 하단: 내 위치 버튼 (T-102) */}
      <Button
        size="icon"
        className="absolute bottom-6 right-3 z-[1001] rounded-full shadow-lg"
        onClick={locate}
        aria-label={t("locate")}
      >
        <LocateFixed className="h-5 w-5" />
      </Button>

      {/* 하단 시트: 빌딩 요약 (T-105) */}
      {selected && (
        <div className="absolute inset-x-3 bottom-4 z-[1002] rounded-xl border bg-background p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{selected.name}</p>
              <p className="truncate text-xs text-muted-foreground">{selected.address}</p>
            </div>
            <button onClick={() => setSelected(null)} aria-label="close">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {selected.ownerVerified && (
              <Badge variant="success">{tBuilding("ownerVerified")}</Badge>
            )}
            {(["male", "female"] as const).map((g) => {
              const toilet = selected.toilets?.[g];
              if (!toilet?.exists) return null;
              return (
                <span key={g} className="flex items-center gap-1 text-xs">
                  <Badge variant="secondary">{tBuilding(g)}</Badge>
                  {toilet.confidence && (
                    <ConfidenceBadge confidence={toilet.confidence} compact />
                  )}
                </span>
              );
            })}
          </div>
          <Button asChild className="mt-3 w-full">
            <Link href={`/building/${selected.id}`}>{t("detail")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
