"use client";

import dynamic from "next/dynamic";

// Leaflet은 SSR 불가 → dynamic import ssr:false 필수 (GUIDE §4-5)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      …
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="fixed inset-x-0 bottom-16 top-14">
      <MapView />
    </div>
  );
}
