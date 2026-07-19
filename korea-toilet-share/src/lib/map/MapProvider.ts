/**
 * 지도 추상화 (TRD §3.1) — React 환경에 맞게 Props 기반 컴포넌트 계약으로 구현.
 * LeafletProvider(기본) / KakaoProvider(Phase 2) 를
 * NEXT_PUBLIC_MAP_PROVIDER env 하나로 교체할 수 있다.
 */
import type { ComponentType } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BuildingMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

export interface MapProviderProps {
  center: LatLng;
  zoom: number;
  markers: BuildingMarker[];
  myLocation?: LatLng | null;
  onMarkerClick?: (id: string) => void;
  onMoved?: (center: LatLng) => void;
}

export type MapProviderComponent = ComponentType<MapProviderProps>;

export type MapProviderName = "osm" | "kakao";

export function getMapProviderName(): MapProviderName {
  return process.env.NEXT_PUBLIC_MAP_PROVIDER === "kakao" ? "kakao" : "osm";
}
