"use client";

import type { MapProviderProps } from "./MapProvider";

/**
 * KakaoProvider — Phase 2 (T-701)에서 구현 예정.
 * NEXT_PUBLIC_KAKAO_JS_KEY 로 Kakao Maps JS SDK를 로드하여
 * MapProviderProps 계약을 그대로 구현하면 env 전환만으로 교체된다.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function KakaoProvider(props: MapProviderProps) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      KakaoProvider는 Phase 2(T-701)에서 제공됩니다. NEXT_PUBLIC_MAP_PROVIDER=osm 을 사용하세요.
    </div>
  );
}
