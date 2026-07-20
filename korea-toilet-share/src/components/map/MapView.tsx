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
import { Eye, List, LocateFixed, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfidenceBadge from "@/components/building/ConfidenceBadge";
import SyncOverlay from "@/components/common/SyncOverlay";
import PendingPinForm, { type PendingPinFields } from "./PendingPinForm";
import VisitorBadge from "./VisitorBadge";
import PinTable from "./PinTable";
import { useAuth } from "@/components/providers/AuthProvider";
import { fetchNearbyBuildings, invalidatePinsCache } from "@/lib/buildings";
import { distanceM, REGISTER_RADIUS_M } from "@/lib/geo";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { addLocalPin } from "@/lib/mock/localPins";
import type { LatLng } from "@/lib/map/MapProvider";
import type { Building } from "@/types/building";

const DEFAULT_CENTER: LatLng = { lat: 37.498095, lng: 127.02761 }; // 강남역
const FETCH_RADIUS_M = 3000;

// Leaflet 기본 아이콘 경로 문제 회피 — 브랜드 컬러 SVG 핀 (GUIDE §8)
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.7 23.3 0 15 0z" fill="#2563EB"/><circle cx="15" cy="14" r="6" fill="#fff"/></svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
});

// 등록 대기 핀 — 참조 디자인의 오렌지 핀
const pendingIcon = L.divIcon({
  className: "",
  html: `<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 2C8.716 2 2 8.716 2 17c0 10.5 15 25 15 25s15-14.5 15-25C32 8.716 25.284 2 17 2z" fill="#f97316" stroke="white" stroke-width="3" stroke-linejoin="round"/><circle cx="17" cy="17" r="6" fill="white"/></svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
});

function MapEvents({
  onMoved,
  onMapClick,
}: {
  onMoved: (c: LatLng) => void;
  onMapClick: (c: LatLng) => void;
}) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      onMoved({ lat: c.lat, lng: c.lng });
    },
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
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
  const tPin = useTranslations("pin");
  const tReport = useTranslations("report");
  const { user, profile } = useAuth();

  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [viewCenter, setViewCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 지도 클릭 핀 등록 상태
  const [pendingPin, setPendingPin] = useState<LatLng | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 반경 초과 안내는 4초 후 자동 소멸
  useEffect(() => {
    if (!rangeError) return;
    const id = setTimeout(() => setRangeError(null), 4000);
    return () => clearTimeout(id);
  }, [rangeError]);

  // 저장 성공 등 안내 배너는 6초 후 자동 소멸
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(id);
  }, [notice]);

  /** 시트 캐시를 비우고 목록을 다시 불러온다 */
  const refreshPins = useCallback(() => {
    invalidatePinsCache();
    setRefreshKey((k) => k + 1);
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoDenied(true);
      return;
    }
    const onOk = (pos: GeolocationPosition) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMyLocation(c);
      setCenter(c);
      setGeoDenied(false);
    };
    navigator.geolocation.getCurrentPosition(
      onOk,
      () => {
        // 고정밀 실패(데스크톱 CoreLocation 등) → 저정밀·캐시 허용으로 1회 재시도
        navigator.geolocation.getCurrentPosition(onOk, () => setGeoDenied(true), {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 600_000,
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 진입 시 GPS 시도 (T-102)
  useEffect(() => {
    locate();
  }, [locate]);

  // 실시간 위치 추적 — 사용자가 이동하면 내 위치를 갱신해 주변 빌딩을 다시 조회 (15m 이상 이동 시)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation((prev) =>
          prev && distanceM(prev.lat, prev.lng, next.lat, next.lng) < 15 ? prev : next
        );
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // 주변 빌딩 조회 (T-105)
  // 표시: 지도 중심 기준 넓은 반경 — GPS가 없어도 등록된 핀을 볼 수 있다.
  // (등록만 실제 GPS 반경 50m 제한 — handleMapClick/서버에서 검증)
  const [pinsLoading, setPinsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setPinsLoading(true);
      try {
        const list = await fetchNearbyBuildings(
          viewCenter.lat,
          viewCenter.lng,
          FETCH_RADIUS_M
        );
        if (!cancelled) setBuildings(list);
      } finally {
        if (!cancelled) setPinsLoading(false);
      }
    };
    run().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [viewCenter, refreshKey]);

  // 지도 클릭 → 대기 핀 + 역지오코딩 주소
  // 등록 제한: 현재 위치 반경 50m 안의 지점만 핀 등록 가능
  const handleMapClick = useCallback(
    (c: LatLng) => {
      setSelected(null);
      setPinError(null);
      if (
        !myLocation ||
        distanceM(myLocation.lat, myLocation.lng, c.lat, c.lng) > REGISTER_RADIUS_M
      ) {
        setPendingPin(null);
        setRangeError(tPin("tooFar"));
        return;
      }
      setRangeError(null);
      setPendingPin(c);
      setPendingAddress(null);
      setPendingName(null);
      fetch(`/api/geocode?lat=${c.lat}&lng=${c.lng}`)
        .then((res) => res.json())
        .then((data: { address?: string; buildingName?: string | null }) => {
          setPendingAddress(data.address || `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`);
          setPendingName(data.buildingName ?? null);
        })
        .catch(() =>
          setPendingAddress(`${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`)
        );
    },
    [myLocation, tPin]
  );

  // 핀 등록 확정
  async function submitPin(fields: PendingPinFields) {
    if (!pendingPin) return;
    setPinBusy(true);
    setPinError(null);
    try {
      if (!isFirebaseConfigured) {
        addLocalPin({
          name: fields.buildingName,
          storeName: fields.storeName || undefined,
          address: pendingAddress ?? "",
          lat: pendingPin.lat,
          lng: pendingPin.lng,
          malePw: fields.malePw || undefined,
          femalePw: fields.femalePw || undefined,
          nickname: profile?.nickname ?? "데모사용자",
        });
        setPendingPin(null);
        setRefreshKey((k) => k + 1);
        return;
      }
      if (!user) return;
      setNotice(null);
      const token = await user.getIdToken();
      // 저장소: Google Sheets (/api/pins) — Firestore 미사용
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fields.buildingName,
          storeName: fields.storeName || undefined,
          address: pendingAddress ?? "",
          lat: pendingPin.lat,
          lng: pendingPin.lng,
          malePw: fields.malePw || undefined,
          femalePw: fields.femalePw || undefined,
          nickname: profile?.nickname ?? user.displayName ?? "user",
          gpsLat: myLocation?.lat,
          gpsLng: myLocation?.lng,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; detail?: string }
        | null;
      if (!res.ok) {
        // 에러 코드·상세 힌트를 함께 노출해 원인 파악 가능하게
        setPinError(
          data?.error === "TOO_FAR"
            ? tPin("tooFar")
            : `${tReport("error")} (${data?.error ?? `HTTP ${res.status}`}${
                data?.detail ? ` — ${data.detail}` : ""
              })`
        );
        return;
      }
      setPendingPin(null);
      // 시트 반영이 몇 초 늦을 수 있음을 안내하고 강제 재조회
      setNotice(tPin("saved"));
      refreshPins();
    } catch {
      setPinError(tReport("error"));
    } finally {
      setPinBusy(false);
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
      {/* 시트 연동 로딩 팝업 — 0.25초 넘게 걸릴 때만 표시 */}
      <SyncOverlay show={pinsLoading} text={tPin("loading")} />
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
        <MapEvents onMoved={setViewCenter} onMapClick={handleMapClick} />
        <PanTo center={center} />
        {myLocation && (
          <CircleMarker
            center={[myLocation.lat, myLocation.lng]}
            radius={8}
            pathOptions={{ color: "#fff", fillColor: "#2563EB", fillOpacity: 1, weight: 3 }}
          />
        )}
        {markers}
        {pendingPin && (
          <Marker position={[pendingPin.lat, pendingPin.lng]} icon={pendingIcon} />
        )}
      </MapContainer>

      {/* 상단: 상태 배너 (주소 검색창은 제거됨 — 2026-07-20 요청) */}
      <div className="absolute inset-x-3 top-3 z-[1001] space-y-2">
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
        {isFirebaseConfigured && (
          <p className="rounded-md bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow">
            {t("nearOnly")}
          </p>
        )}
        {rangeError && (
          <p className="rounded-md bg-orange-50/95 px-3 py-2 text-xs font-medium text-orange-700 shadow">
            {rangeError}
          </p>
        )}
        {notice && (
          <p className="rounded-md bg-green-50/95 px-3 py-2 text-xs font-medium text-green-800 shadow">
            {notice}
          </p>
        )}
      </div>

      {/* 좌측 하단: 핀 목록 토글 */}
      {!tableOpen && !pendingPin && (
        <Button
          variant="secondary"
          className="absolute bottom-6 left-3 z-[1001] shadow-lg"
          onClick={() => setTableOpen(true)}
        >
          <List className="h-4 w-4" />
          {tPin("list")} ({buildings.length})
        </Button>
      )}

      {/* 우측 하단: 방문자 배지 (오늘/누적) */}
      <VisitorBadge />

      {/* 우측 하단: 내 위치 버튼 (T-102) */}
      <Button
        size="icon"
        className="absolute bottom-6 right-3 z-[1001] rounded-full shadow-lg"
        onClick={locate}
        aria-label={t("locate")}
      >
        <LocateFixed className="h-5 w-5" />
      </Button>

      {/* 지도 클릭 → 핀 등록 폼 (오렌지 카드) */}
      {pendingPin && (
        <div className="absolute inset-x-3 bottom-4 z-[1002]">
          <PendingPinForm
            key={`${pendingPin.lat},${pendingPin.lng}`}
            address={pendingAddress}
            suggestedName={pendingName}
            busy={pinBusy}
            serverError={pinError}
            onSubmit={submitPin}
            onCancel={() => setPendingPin(null)}
          />
        </div>
      )}

      {/* 마커 클릭 → 빌딩 요약 시트 (T-105) */}
      {selected && !pendingPin && (
        <div className="absolute inset-x-3 bottom-4 z-[1002] rounded-xl border bg-background p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{selected.name}</p>
              {selected.storeName && (
                <p className="truncate text-xs text-muted-foreground">{selected.storeName}</p>
              )}
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
          <div className="mt-3 flex gap-2">
            {/* 네이버 지도 거리뷰 레이어를 핀 좌표에서 바로 연다 */}
            <Button asChild variant="outline" className="flex-1">
              <a
                href={`https://map.naver.com/v5/?c=${selected.lng},${selected.lat},18,0,0,0,dh`}
                target="_blank"
                rel="noreferrer"
              >
                <Eye className="h-4 w-4" />
                {t("roadview")}
              </a>
            </Button>
            <Button asChild className="flex-1">
              <Link href={`/building/${selected.id}`}>{t("detail")}</Link>
            </Button>
          </div>
        </div>
      )}

      {/* 핀 목록 표 — 건물명·점포명·남자비번·여자비번·등록일·등록자·맞아요·틀려요 */}
      {tableOpen && (
        <PinTable
          buildings={buildings}
          onClose={() => setTableOpen(false)}
          onRefresh={refreshPins}
          onRowClick={(b) => {
            setCenter({ lat: b.lat, lng: b.lng });
            setSelected(b);
            setTableOpen(false);
          }}
        />
      )}
    </div>
  );
}
