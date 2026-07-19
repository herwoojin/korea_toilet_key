import type { Building, Gender } from "@/types/building";

/**
 * 데모 모드 전용 — 지도 클릭으로 등록한 핀을 브라우저 메모리에 보관.
 * Firebase env 설정 시에는 /api/report 를 통해 Firestore에 저장된다.
 */
let seq = 1;

export const LOCAL_PINS: Building[] = [];
const LOCAL_SECRETS: Record<string, Partial<Record<Gender, string>>> = {};

export interface LocalPinInput {
  name: string;
  storeName?: string;
  address: string;
  lat: number;
  lng: number;
  malePw?: string;
  femalePw?: string;
  nickname: string;
}

export function addLocalPin(input: LocalPinInput): Building {
  const id = `local-${seq++}`;
  const now = Date.now();
  const pin: Building = {
    id,
    name: input.name,
    storeName: input.storeName || undefined,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    geohash: "",
    status: "active",
    createdByNickname: input.nickname,
    createdAt: now,
    updatedAt: now,
    toilets: {
      male: input.malePw
        ? { exists: true, hasPassword: true, confidence: "low", reportCount: 1, correctCount: 0, wrongCount: 0 }
        : { exists: false, hasPassword: false },
      female: input.femalePw
        ? { exists: true, hasPassword: true, confidence: "low", reportCount: 1, correctCount: 0, wrongCount: 0 }
        : { exists: false, hasPassword: false },
    },
  };
  LOCAL_PINS.push(pin);
  LOCAL_SECRETS[id] = {
    ...(input.malePw ? { male: input.malePw } : {}),
    ...(input.femalePw ? { female: input.femalePw } : {}),
  };
  return pin;
}

export function getLocalSecret(buildingId: string, gender: Gender): string | undefined {
  return LOCAL_SECRETS[buildingId]?.[gender];
}
