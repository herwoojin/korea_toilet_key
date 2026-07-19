/**
 * 개발용 시드 스크립트 (T-104~105)
 * 강남역 주변 가상 빌딩 10개 + secrets 를 Firestore에 등록한다.
 *
 * 사용법:
 *   1. .env.local 에 FIREBASE_ADMIN_KEY 설정 (ENV_SETUP_GUIDE.md 참고)
 *   2. npm run seed
 */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { geohashForLocation } from "geofire-common";

// .env.local 간이 파서 (외부 의존성 없이)
function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let value = m[2].trim();
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      if (value && !process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    /* .env.local 없어도 계속 */
  }
}

loadEnvLocal();

if (!process.env.FIREBASE_ADMIN_KEY) {
  console.error("❌ FIREBASE_ADMIN_KEY가 없습니다. ENV_SETUP_GUIDE.md를 참고해 .env.local에 설정하세요.");
  process.exit(1);
}

const sa = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
if (typeof sa.private_key === "string") {
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
}
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// 데모 데이터 (src/lib/mock/buildings.ts 와 동일 좌표/구성)
const BUILDINGS = [
  { id: "demo-1", name: "강남스퀘어 타워 (데모)", address: "서울 강남구 강남대로 396", lat: 37.49795, lng: 127.02758, ownerVerified: true, secrets: { male: "1234*", female: "5678*" }, male: "2층 엘리베이터 옆", female: "3층 계단 옆" },
  { id: "demo-2", name: "역삼 미래빌딩 (데모)", address: "서울 강남구 테헤란로 152", lat: 37.50035, lng: 127.0364, secrets: { male: "2580#", female: "2580#" }, male: "1층 로비 안쪽", female: "1층 로비 안쪽" },
  { id: "demo-3", name: "서초 한빛프라자 (데모)", address: "서울 서초구 서초대로 320", lat: 37.4945, lng: 127.0235, secrets: { female: "1111*" }, male: "지하 1층", female: "지하 1층", maleUnlocked: true },
  { id: "demo-4", name: "강남역 중앙상가 (데모)", address: "서울 강남구 강남대로 지하 396", lat: 37.4972, lng: 127.0295, status: "disputed", secrets: { male: "9999#", female: "9999#" }, male: "상가 안쪽 복도 끝", female: "상가 안쪽 복도 끝" },
  { id: "demo-5", name: "테헤란 오피스텔 A동 (데모)", address: "서울 강남구 테헤란로 129", lat: 37.4996, lng: 127.0322, secrets: { male: "4321*" }, male: "3층 복도", noFemale: true },
  { id: "demo-6", name: "논현 그린빌딩 (데모)", address: "서울 강남구 논현로 508", lat: 37.5041, lng: 127.0253, secrets: { male: "7788#", female: "7788#" }, male: "2층 계단 옆", female: "2층 계단 옆" },
  { id: "demo-7", name: "서초동 카페거리 상가 (데모)", address: "서울 서초구 강남대로 61길 10", lat: 37.4931, lng: 127.0301, secrets: { male: "1004*", female: "1004*" }, male: "1층 뒤편 야외 통로", female: "2층" },
  { id: "demo-8", name: "삼성타운 인근 상가 (데모)", address: "서울 서초구 서초대로74길 11", lat: 37.4956, lng: 127.0246, secrets: { male: "0505#", female: "0505#" }, male: "4층 화장실", female: "4층 화장실" },
  { id: "demo-9", name: "강남파이낸스 별관 (데모)", address: "서울 강남구 테헤란로 5길 7", lat: 37.4988, lng: 127.0288, secrets: { male: "3141*", female: "3141*" }, male: "지하 1층 푸드코트 옆", female: "지하 1층 푸드코트 옆" },
  { id: "demo-10", name: "신논현 상가빌딩 (데모)", address: "서울 강남구 봉은사로 102", lat: 37.5049, lng: 127.0272, secrets: { male: "8282#", female: "8282#" }, male: "1층 편의점 옆 복도", female: "1층 편의점 옆 복도" },
];

function toilet(desc, hasPassword, exists = true) {
  return {
    exists,
    ...(desc ? { locationDesc: desc } : {}),
    hasPassword,
    confidence: hasPassword ? "medium" : "high",
    reportCount: hasPassword ? 2 : 1,
  };
}

for (const b of BUILDINGS) {
  await db.doc(`buildings/${b.id}`).set({
    name: b.name,
    address: b.address,
    lat: b.lat,
    lng: b.lng,
    geohash: geohashForLocation([b.lat, b.lng]),
    toilets: {
      male: toilet(b.male, Boolean(b.secrets?.male) && !b.maleUnlocked, Boolean(b.male)),
      female: b.noFemale
        ? { exists: false, hasPassword: false }
        : toilet(b.female, Boolean(b.secrets?.female), Boolean(b.female)),
    },
    ownerVerified: Boolean(b.ownerVerified),
    isPublicByOwner: Boolean(b.ownerVerified),
    status: b.status ?? "active",
    createdBy: "seed-script",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const secretDoc = { computedAt: FieldValue.serverTimestamp() };
  for (const g of ["male", "female"]) {
    if (b.secrets?.[g]) {
      secretDoc[g] = { current: b.secrets[g], candidates: [{ value: b.secrets[g], score: 2.6 }] };
    }
  }
  await db.doc(`secrets/${b.id}`).set(secretDoc);
  console.log(`✅ ${b.id} ${b.name}`);
}

console.log("🎉 시드 완료 — 지도에서 강남역 주변을 확인하세요.");
