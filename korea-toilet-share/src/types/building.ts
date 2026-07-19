export type Gender = "male" | "female";
export type Confidence = "high" | "medium" | "low";
export type BuildingStatus = "active" | "disputed" | "hidden";

export interface ToiletInfo {
  exists: boolean;
  locationDesc?: string;
  hasPassword: boolean;
  confidence?: Confidence;
  reportCount?: number;
  /** Firestore Timestamp | millis | null */
  lastConfirmedAt?: unknown;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  geohash: string;
  toilets: { male?: ToiletInfo; female?: ToiletInfo };
  ownerId?: string;
  ownerVerified?: boolean;
  isPublicByOwner?: boolean;
  status: BuildingStatus;
  /** Firestore Timestamp | millis | null */
  updatedAt?: unknown;
}

/** Firestore Timestamp / millis / Date 무엇이든 millis로 변환 */
export function toMillis(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "object" && "toMillis" in (v as object)) {
    return (v as { toMillis(): number }).toMillis();
  }
  return null;
}
