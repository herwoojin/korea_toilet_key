import type { Building, Gender } from "@/types/building";

/**
 * 개발용 시드/데모 데이터 — 강남역 주변 가상 빌딩 10개.
 * Firebase env 미설정 시 지도에 이 데이터가 표시된다.
 * scripts/seed.mjs 가 같은 데이터를 Firestore에 시드한다.
 */
const DAY = 86_400_000;
const now = Date.now();

export const MOCK_BUILDINGS: Building[] = [
  {
    id: "demo-1",
    name: "강남스퀘어 타워 (데모)",
    address: "서울 강남구 강남대로 396",
    lat: 37.49795,
    lng: 127.02758,
    geohash: "",
    status: "active",
    ownerVerified: true,
    isPublicByOwner: true,
    updatedAt: now - 2 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "2층 엘리베이터 옆", hasPassword: true, confidence: "high", reportCount: 7, lastConfirmedAt: now - 1 * DAY },
      female: { exists: true, locationDesc: "3층 계단 옆", hasPassword: true, confidence: "high", reportCount: 6, lastConfirmedAt: now - 1 * DAY },
    },
  },
  {
    id: "demo-2",
    name: "역삼 미래빌딩 (데모)",
    address: "서울 강남구 테헤란로 152",
    lat: 37.50035,
    lng: 127.0364,
    geohash: "",
    status: "active",
    updatedAt: now - 5 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "1층 로비 안쪽", hasPassword: true, confidence: "medium", reportCount: 3, lastConfirmedAt: now - 4 * DAY },
      female: { exists: true, locationDesc: "1층 로비 안쪽", hasPassword: true, confidence: "medium", reportCount: 3, lastConfirmedAt: now - 4 * DAY },
    },
  },
  {
    id: "demo-3",
    name: "서초 한빛프라자 (데모)",
    address: "서울 서초구 서초대로 320",
    lat: 37.4945,
    lng: 127.0235,
    geohash: "",
    status: "active",
    updatedAt: now - 10 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "지하 1층", hasPassword: false, confidence: "high", reportCount: 4 },
      female: { exists: true, locationDesc: "지하 1층", hasPassword: true, confidence: "low", reportCount: 1, lastConfirmedAt: now - 30 * DAY },
    },
  },
  {
    id: "demo-4",
    name: "강남역 중앙상가 (데모)",
    address: "서울 강남구 강남대로 지하 396",
    lat: 37.4972,
    lng: 127.0295,
    geohash: "",
    status: "disputed",
    updatedAt: now - 1 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "상가 안쪽 복도 끝", hasPassword: true, confidence: "medium", reportCount: 2 },
      female: { exists: true, locationDesc: "상가 안쪽 복도 끝", hasPassword: true, confidence: "medium", reportCount: 2 },
    },
  },
  {
    id: "demo-5",
    name: "테헤란 오피스텔 A동 (데모)",
    address: "서울 강남구 테헤란로 129",
    lat: 37.4996,
    lng: 127.0322,
    geohash: "",
    status: "active",
    updatedAt: now - 3 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "3층 복도", hasPassword: true, confidence: "high", reportCount: 5, lastConfirmedAt: now - 2 * DAY },
      female: { exists: false, hasPassword: false },
    },
  },
  {
    id: "demo-6",
    name: "논현 그린빌딩 (데모)",
    address: "서울 강남구 논현로 508",
    lat: 37.5041,
    lng: 127.0253,
    geohash: "",
    status: "active",
    updatedAt: now - 7 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "2층 계단 옆", hasPassword: true, confidence: "low", reportCount: 1 },
      female: { exists: true, locationDesc: "2층 계단 옆", hasPassword: true, confidence: "low", reportCount: 1 },
    },
  },
  {
    id: "demo-7",
    name: "서초동 카페거리 상가 (데모)",
    address: "서울 서초구 강남대로 61길 10",
    lat: 37.4931,
    lng: 127.0301,
    geohash: "",
    status: "active",
    updatedAt: now - 14 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "1층 뒤편 야외 통로", hasPassword: true, confidence: "medium", reportCount: 2, lastConfirmedAt: now - 10 * DAY },
      female: { exists: true, locationDesc: "2층", hasPassword: true, confidence: "medium", reportCount: 2, lastConfirmedAt: now - 10 * DAY },
    },
  },
  {
    id: "demo-8",
    name: "삼성타운 인근 상가 (데모)",
    address: "서울 서초구 서초대로74길 11",
    lat: 37.4956,
    lng: 127.0246,
    geohash: "",
    status: "active",
    updatedAt: now - 6 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "4층 화장실", hasPassword: true, confidence: "high", reportCount: 8, lastConfirmedAt: now - 1 * DAY },
      female: { exists: true, locationDesc: "4층 화장실", hasPassword: true, confidence: "high", reportCount: 9, lastConfirmedAt: now - 1 * DAY },
    },
  },
  {
    id: "demo-9",
    name: "강남파이낸스 별관 (데모)",
    address: "서울 강남구 테헤란로 5길 7",
    lat: 37.4988,
    lng: 127.0288,
    geohash: "",
    status: "active",
    updatedAt: now - 20 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "지하 1층 푸드코트 옆", hasPassword: true, confidence: "medium", reportCount: 3, lastConfirmedAt: now - 15 * DAY },
      female: { exists: true, locationDesc: "지하 1층 푸드코트 옆", hasPassword: true, confidence: "medium", reportCount: 4, lastConfirmedAt: now - 12 * DAY },
    },
  },
  {
    id: "demo-10",
    name: "신논현 상가빌딩 (데모)",
    address: "서울 강남구 봉은사로 102",
    lat: 37.5049,
    lng: 127.0272,
    geohash: "",
    status: "active",
    updatedAt: now - 4 * DAY,
    toilets: {
      male: { exists: true, locationDesc: "1층 편의점 옆 복도", hasPassword: true, confidence: "low", reportCount: 1 },
      female: { exists: true, locationDesc: "1층 편의점 옆 복도", hasPassword: true, confidence: "medium", reportCount: 2, lastConfirmedAt: now - 3 * DAY },
    },
  },
];

/** 데모 모드 전용 비밀번호 (실서비스에서는 secrets 컬렉션 = 서버 전용) */
export const MOCK_SECRETS: Record<string, Partial<Record<Gender, string>>> = {
  "demo-1": { male: "1234*", female: "5678*" },
  "demo-2": { male: "2580#", female: "2580#" },
  "demo-3": { female: "1111*" },
  "demo-4": { male: "9999#", female: "9999#" },
  "demo-5": { male: "4321*" },
  "demo-6": { male: "7788#", female: "7788#" },
  "demo-7": { male: "1004*", female: "1004*" },
  "demo-8": { male: "0505#", female: "0505#" },
  "demo-9": { male: "3141*", female: "3141*" },
  "demo-10": { male: "8282#", female: "8282#" },
};
