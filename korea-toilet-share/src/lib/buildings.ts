import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  orderBy,
  query,
  startAt,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { distanceM, radiusBounds } from "@/lib/geo";
import { MOCK_BUILDINGS } from "@/lib/mock/buildings";
import type { Building } from "@/types/building";

/** 주변 빌딩 조회 — Firebase 미설정 시 데모 데이터 반환 */
export async function fetchNearbyBuildings(
  lat: number,
  lng: number,
  radiusMeters = 800
): Promise<Building[]> {
  if (!isFirebaseConfigured) {
    return MOCK_BUILDINGS.filter(
      (b) => distanceM(lat, lng, b.lat, b.lng) <= Math.max(radiusMeters, 2000)
    );
  }
  const db = getDb();
  const seen = new Map<string, Building>();
  for (const [start, end] of radiusBounds(lat, lng, radiusMeters)) {
    const snap = await getDocs(
      query(collection(db, "buildings"), orderBy("geohash"), startAt(start), endAt(end))
    );
    snap.forEach((d) => {
      const data = d.data() as Building;
      if (data.status !== "hidden") seen.set(d.id, { ...data, id: d.id });
    });
  }
  return [...seen.values()].filter(
    (b) => distanceM(lat, lng, b.lat, b.lng) <= radiusMeters
  );
}

export async function fetchBuilding(id: string): Promise<Building | null> {
  if (!isFirebaseConfigured) {
    return MOCK_BUILDINGS.find((b) => b.id === id) ?? null;
  }
  const snap = await getDoc(doc(getDb(), "buildings", id));
  return snap.exists() ? ({ ...(snap.data() as Building), id: snap.id }) : null;
}
