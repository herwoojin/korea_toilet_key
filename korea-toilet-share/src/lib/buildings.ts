import { isFirebaseConfigured } from "@/lib/firebase/client";
import { distanceM } from "@/lib/geo";
import { MOCK_BUILDINGS } from "@/lib/mock/buildings";
import { LOCAL_PINS } from "@/lib/mock/localPins";
import type { Building } from "@/types/building";

/**
 * 핀 저장소: Google Sheets (/api/pins 프록시) — Firestore 저장은 사용하지 않음.
 * Firebase env 미설정(데모 모드) 시에는 브라우저 메모리 데이터 반환.
 *
 * 시트 응답이 느리고 간헐 실패할 수 있어 목록 안정화 장치를 둔다:
 *  - 15초 캐시(TTL) — GPS 갱신마다 시트를 다시 읽지 않음
 *  - 동시 요청은 한 번의 fetch를 공유
 *  - 실패 시 빈 목록 대신 마지막 성공 데이터 유지
 */
let pinsCache: { at: number; data: Building[] } | null = null;
let pinsInflight: Promise<Building[]> | null = null;
const PINS_TTL_MS = 15_000;

/** 핀 등록 직후 강제 재조회를 위해 호출 */
export function invalidatePinsCache() {
  pinsCache = null;
}

async function fetchAllPins(): Promise<Building[]> {
  if (pinsCache && Date.now() - pinsCache.at < PINS_TTL_MS) return pinsCache.data;
  if (pinsInflight) return pinsInflight;
  pinsInflight = (async () => {
    try {
      const res = await fetch("/api/pins", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { buildings?: Building[] };
      pinsCache = { at: Date.now(), data: data.buildings ?? [] };
      return pinsCache.data;
    } catch {
      return pinsCache?.data ?? [];
    } finally {
      pinsInflight = null;
    }
  })();
  return pinsInflight;
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
