import {
  distanceBetween,
  geohashForLocation,
  geohashQueryBounds,
} from "geofire-common";

export const DEFAULT_RADIUS_M = 500;
export const MAX_RADIUS_M = 2000;
/** 이 거리 이내면 "현장" 열람/제보로 판정 (TRD §3.3) */
export const ONSITE_THRESHOLD_M = 150;
/** 실제 위치 기준 빌딩 표시·핀 등록 허용 반경 (2026-07-19 사용자 요구: 50m) */
export const REGISTER_RADIUS_M = 50;

export function computeGeohash(lat: number, lng: number): string {
  return geohashForLocation([lat, lng]);
}

/** 두 좌표 간 거리(미터, 반올림) */
export function distanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return Math.round(distanceBetween([lat1, lng1], [lat2, lng2]) * 1000);
}

/** 반경 쿼리용 geohash 범위 목록 — 경계 셀 누락 방지를 위해 전체 순회 필수 */
export function radiusBounds(
  lat: number,
  lng: number,
  radiusMeters: number
): string[][] {
  return geohashQueryBounds([lat, lng], Math.min(radiusMeters, MAX_RADIUS_M));
}
