export type Gender = "male" | "female";
export type Confidence = "high" | "medium" | "low";
export type BuildingStatus = "active" | "disputed" | "hidden";

export interface ToiletInfo {
  exists: boolean;
  locationDesc?: string;
  hasPassword: boolean;
  confidence?: Confidence;
  reportCount?: number;
  /** 맞아요/틀려요 피드백 수 (캐시) */
  correctCount?: number;
  wrongCount?: number;
  /** Firestore Timestamp | millis | null */
  lastConfirmedAt?: unknown;
}

export interface Building {
  id: string;
  name: string;
  /** 점포명 (핀 등록 시 입력) */
  storeName?: string;
  address: string;
  lat: number;
  lng: number;
  geohash: string;
  toilets: { male?: ToiletInfo; female?: ToiletInfo };
  /** 구글시트 저장소 모드 — 비번이 목록 응답에 포함됨 (시트 자체가 공유 문서) */
  passwords?: { male?: string; female?: string };
  /** 비밀번호 열람(관심) 클릭 수 — 포인트 산정용 */
  views?: number;
  /** 등록자 uid — 내 핀 포인트 계산용 */
  createdByUid?: string;
  ownerId?: string;
  ownerVerified?: boolean;
  isPublicByOwner?: boolean;
  status: BuildingStatus;
  /** 등록자 닉네임 스냅샷 */
  createdByNickname?: string;
  /** Firestore Timestamp | millis | null */
  createdAt?: unknown;
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
