import { isFirebaseConfigured } from "@/lib/firebase/client";
import { distanceM } from "@/lib/geo";
import { MOCK_BUILDINGS } from "@/lib/mock/buildings";
import { LOCAL_PINS } from "@/lib/mock/localPins";
import type { Building } from "@/types/building";

/**
 * 핀 저장소: Google Sheets (/api/pins 프록시) — Firestore 저장은 사용하지 않음.
 * Firebase env 미설정(데모 모드) 시에는 브라우저 메모리 데이터 반환.
 */
async function fetchAllPins(): Promise<Building[]> {
  const res = await fetch("/api/pins", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => null)) as
    | { buildings?: Building[] }
    | null;
  return data?.buildings ?? [];
}

/** 주변 빌딩 조회 — Firebase 미설정 시 데모 데이터 반환 */
export async function fetchNearbyBuildings(
  lat: number,
  lng: number,
  radiusMeters = 800
): Promise<Building[]> {
  if (!isFirebaseConfigured) {
    return [...MOCK_BUILDINGS, ...LOCAL_PINS].filter(
      (b) => distanceM(lat, lng, b.lat, b.lng) <= Math.max(radiusMeters, 2000)
    );
  }
  const all = await fetchAllPins();
  return all.filter((b) => distanceM(lat, lng, b.lat, b.lng) <= radiusMeters);
}

export async function fetchBuilding(id: string): Promise<Building | null> {
  if (!isFirebaseConfigured) {
    return (
      MOCK_BUILDINGS.find((b) => b.id === id) ??
      LOCAL_PINS.find((b) => b.id === id) ??
      null
    );
  }
  const all = await fetchAllPins();
  return all.find((b) => b.id === id) ?? null;
}
