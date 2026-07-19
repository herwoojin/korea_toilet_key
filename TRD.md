# TRD — Korea Toilet Sharing Service

> 기술 요구사항 정의서 (Technical Requirements Document)
> 버전: 1.0 | PRD 1.0 기준

---

## 1. 기술 스택

| 레이어 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router) + TypeScript | 표준 스택 유지 |
| 스타일 | Tailwind CSS + shadcn/ui | 모바일 우선 반응형 |
| 지도 (Phase 1) | Leaflet + react-leaflet + OpenStreetMap 타일 | API 키 불필요, 즉시 시작 |
| 지도 (Phase 2) | Kakao Maps JavaScript SDK | 한국 주소·건물 정확도 향상, 병행 어댑터 구조 |
| 주소/지오코딩 | Kakao Local REST API (주소↔좌표 변환, 키워드 검색) | 무료 쿼터 충분 |
| 인증 | Firebase Authentication — Google Provider + Kakao(OIDC Custom Provider 또는 Kakao SDK→Custom Token) | 아래 3.2 참조 |
| DB | Cloud Firestore | PRD 지정 |
| 배포 | Vercel | 표준 스택 유지 |
| i18n | next-intl | ko / en / zh-CN / ja |
| PWA | next-pwa (선택) | 홈 화면 추가, 오프라인 셸 |
| 지오쿼리 | geofire-common (geohash) | 반경 내 빌딩 조회 |

## 2. 시스템 아키텍처

```
[브라우저 (PWA)]
   ├─ Next.js (Vercel) ── SSR/정적 페이지, i18n 라우팅 (/ko /en /zh /ja)
   ├─ Leaflet(OSM) 또는 Kakao Map (MapProvider 어댑터로 추상화)
   ├─ Firebase JS SDK
   │     ├─ Auth (Google / Kakao)
   │     └─ Firestore (Security Rules로 접근 통제)
   └─ Kakao Local API (지오코딩; Next.js Route Handler로 프록시하여 키 은닉)
```

- 서버 로직 최소화 원칙: 대부분 클라이언트 ↔ Firestore 직결, 민감 로직만 Route Handler / Cloud Functions.
- **비밀번호 열람은 반드시 서버 경유** (Route Handler `/api/reveal`): 열람 로그를 트랜잭션으로 먼저 기록한 뒤에만 비밀번호를 반환한다. 클라이언트가 Firestore에서 비밀번호 필드를 직접 읽지 못하도록 Security Rules로 차단. (로그 없는 열람 원천 봉쇄)

## 3. 핵심 기술 설계

### 3.1 지도 추상화 (MapProvider)
```ts
interface MapProvider {
  init(container, center, zoom): void
  setMarkers(buildings: BuildingMarker[]): void
  onMarkerClick(cb): void
  panTo(lat, lng): void
}
// LeafletProvider(기본) / KakaoProvider(전환 가능) — env 플래그로 선택
```

### 3.2 카카오 로그인 통합
- 권장: **Kakao JS SDK로 인가코드 취득 → Route Handler에서 토큰 교환 및 검증 → Firebase Admin SDK로 Custom Token 발급 → signInWithCustomToken**.
- 대안: Firebase Auth OIDC Provider에 Kakao OIDC 등록(카카오 OIDC 활성화 필요). 구현 난이도 낮으면 대안 우선.
- users 문서에 provider(google|kakao), 인증 배지 필드 저장.

### 3.3 위치 & 지오쿼리
- `navigator.geolocation`으로 현재 좌표 취득 (권한 거부 시 주소 검색 모드로 폴백).
- 빌딩 문서에 `geohash` 저장, geofire-common으로 반경 500m~2km 쿼리.
- 열람 시점 GPS를 로그에 함께 저장 → 빌딩 좌표와의 거리로 "현장 열람" 여부 판정(150m 이내 = 현장).

### 3.4 신뢰도 합의 알고리즘 (대표 비밀번호 추정)
동일 빌딩·성별에 대한 제보들을 후보 비밀번호별로 그룹핑 후 점수 계산:

```
score(후보) = Σ 제보별 [ W_base(1.0)
                × W_recency(최근 30일 1.0 → 180일 0.3 선형감쇠)
                × W_reporter(본인인증 1.5 / 일반 1.0)
                × W_onsite(현장 제보 1.3 / 원격 1.0) ]
              + 피드백 보정(맞았어요 +0.5, 틀렸어요 −1.0)
오너 공식 등록 존재 시 → 무조건 오너 값이 대표값 (score 무시)
```
- 대표값 신뢰 등급: score ≥ 5 높음 / 2~5 보통 / <2 낮음.
- 계산 시점: 제보/피드백 발생 시 Route Handler에서 재계산하여 `buildings/{id}.toilets.{gender}.currentPassword` 캐시 필드 갱신(읽기 비용 절감).

### 3.5 체류 검증 (Phase 2)
- 브라우저 웹앱 특성상 백그라운드 추적은 제한적 → v1은 **열람/제보 시점 GPS 근접성**으로 대체.
- v2: PWA 포그라운드에서 5분 간격 좌표 샘플링(사용자 동의) → 동일 지오해시 셀 내 2회 이상 = 체류 인정.

### 3.6 본인인증 (무료 범위)
- 1단계(무료): Firebase Auth Phone Authentication(SMS) — 무료 쿼터 내 휴대폰 실번호 확인. `users.phoneVerified = true` + 배지.
- 2단계(유료, 보류): PASS/아임포트 등 실명 본인확인은 건당 과금이므로 v2 이후 검토.

### 3.7 i18n
- next-intl 미들웨어 기반 로케일 라우팅: `/ko`(기본), `/en`, `/zh`, `/ja`.
- 메시지 파일: `messages/{ko,en,zh,ja}.json`. 브라우저 언어 자동 감지 + 수동 전환 저장(localStorage).

### 3.8 Firestore Security Rules 핵심 원칙
```
- buildings: read 공개(단, 비밀번호 원문 필드는 서브컬렉션 secrets/에 분리, 클라이언트 read 금지)
- secrets/{buildingId}: Admin SDK(서버)만 read → /api/reveal 경유 강제
- reports(제보): 로그인 사용자만 create, 본인 것만 update 불가(불변), 수정은 신규 제보로
- viewLogs: 서버만 create, 오너는 자기 빌딩 로그만 read
- users: 본인 문서만 read/write
```

### 3.9 파비콘/브랜딩
- 지도 핀 + 화장실 남녀 픽토그램 + 자물쇠(열림) 조합의 SVG 파비콘 제작 → `favicon.ico`, `apple-touch-icon`, PWA manifest 아이콘 일괄 생성.
- `<title>`: "Korea Toilet Sharing Service | 코리아 토일럿 쉐어링".

## 4. 환경 변수

| 키 | 용도 |
|---|---|
| NEXT_PUBLIC_FIREBASE_* | Firebase 클라이언트 설정 |
| FIREBASE_ADMIN_KEY | Admin SDK 서비스 계정 (서버 전용) |
| KAKAO_REST_API_KEY | 지오코딩 프록시 (서버 전용) |
| NEXT_PUBLIC_KAKAO_JS_KEY | 카카오 지도/로그인 SDK |
| NEXT_PUBLIC_MAP_PROVIDER | `osm` \| `kakao` |

## 5. 성능·비용 가드레일

- Firestore 읽기 절감: 대표 비밀번호를 buildings 문서에 캐시, 지도 마커는 지오해시 셀 단위 페이지네이션.
- OSM 타일은 무료 정책 준수(트래픽 증가 시 MapTiler 등 전환), Kakao API 일 쿼터 모니터링.
- Vercel/Firebase 무료 티어 초과 알림 설정.

## 6. 테스트 & 품질

- 단위: 합의 알고리즘(score 계산) Vitest 테스트 필수.
- E2E: 로그인 → 지도 → 열람 → 피드백 핵심 플로우 Playwright 1개 시나리오.
- Security Rules: Firebase Emulator + rules 단위 테스트(비밀번호 직접 read 차단 검증).
