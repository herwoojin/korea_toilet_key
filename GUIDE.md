# GUIDE — Korea Toilet Sharing Service 개발 가이드

> 프로젝트 셋업 · 폴더 구조 · 컨벤션 · 배포 가이드
> 버전: 1.0

---

## 1. 사전 준비 (외부 서비스 콘솔 작업)

### 1.1 Firebase
1. Firebase 콘솔에서 프로젝트 생성 (`korea-toilet-share`)
2. Authentication → Sign-in method → **Google** 활성화
3. Authentication → **전화(Phone)** 활성화 (본인인증용, Phase 2)
4. Firestore Database 생성 (asia-northeast3 / 프로덕션 모드)
5. 프로젝트 설정 → 웹앱 등록 → 클라이언트 config 복사
6. 서비스 계정 → Admin SDK 비공개 키 발급 (서버 전용, 절대 커밋 금지)

### 1.2 Kakao Developers
1. 애플리케이션 생성 → JavaScript 키 / REST API 키 확보
2. 카카오 로그인 활성화 → Redirect URI 등록 (`http://localhost:3000/api/auth/kakao/callback`, 배포 도메인)
3. (선택) OpenID Connect 활성화 — 활성화 가능하면 Firebase OIDC Provider 방식 사용
4. 플랫폼 → Web 도메인 등록 (지도 SDK용)

### 1.3 Vercel
- GitHub 저장소 연결, 환경 변수 등록 (TRD §4 목록 전체)

## 2. 프로젝트 초기화

```bash
npx create-next-app@latest korea-toilet-share --typescript --tailwind --app --eslint
cd korea-toilet-share
npx shadcn@latest init
npm i firebase firebase-admin leaflet react-leaflet geofire-common next-intl
npm i -D @types/leaflet vitest @playwright/test
```

## 3. 폴더 구조

```
src/
├─ app/
│  ├─ [locale]/                 # next-intl 로케일 세그먼트 (ko|en|zh|ja)
│  │  ├─ page.tsx               # 메인 지도 화면
│  │  ├─ building/[id]/page.tsx # 빌딩 상세
│  │  ├─ report/page.tsx        # 비밀번호 제보
│  │  ├─ my/page.tsx            # 내 열람기록/포인트
│  │  ├─ owner/page.tsx         # 오너 대시보드 (열람 로그)
│  │  └─ culture/page.tsx       # 한국 화장실 문화 안내 (외국인 온보딩)
│  └─ api/
│     ├─ reveal/route.ts        # ★ 열람 로그 기록 후 비밀번호 반환
│     ├─ report/route.ts        # 제보 접수 + 합의 재계산
│     ├─ feedback/route.ts      # 맞았어요/틀렸어요 + 재계산
│     ├─ geocode/route.ts       # Kakao Local API 프록시
│     └─ auth/kakao/…           # 카카오 → Firebase Custom Token
├─ components/
│  ├─ map/ (MapContainer, BuildingMarker, LocateButton)
│  ├─ building/ (ToiletCard, ConfidenceBadge, RevealButton, FeedbackButtons)
│  └─ common/ (LanguageSwitcher, EtiquettePledgeModal, LoginSheet)
├─ lib/
│  ├─ firebase/ (client.ts, admin.ts)
│  ├─ map/ (MapProvider.ts, LeafletProvider.tsx, KakaoProvider.tsx)
│  ├─ consensus.ts              # ★ 신뢰도 합의 알고리즘 (순수함수, 테스트 대상)
│  └─ geo.ts                    # geohash, 거리 계산
├─ messages/ (ko.json, en.json, zh.json, ja.json)
└─ types/ (building.ts, report.ts, user.ts)
```

## 4. 핵심 구현 규칙

1. **비밀번호는 절대 클라이언트에서 Firestore로 직접 읽지 않는다.** 항상 `/api/reveal` 경유. reveal API는 ① 로그인 검증 ② 에티켓 서약 확인 ③ viewLogs 기록(트랜잭션) ④ 비밀번호 반환 순서를 지킨다. 실패 시 비밀번호를 반환하지 않는다.
2. `consensus.ts`는 부수효과 없는 순수함수로 작성하고 Vitest 테스트를 먼저 작성한다 (TRD §3.4 가중치 공식).
3. 지도 컴포넌트는 `MapProvider` 인터페이스로만 접근 — Leaflet/Kakao 교체가 env 변수 하나로 가능해야 한다.
4. 모든 사용자 노출 문자열은 `messages/*.json` 경유 (하드코딩 금지). 한국어 작성 → 나머지 3개 언어 번역 파일 동시 갱신.
5. Leaflet은 SSR 불가 → `dynamic(() => import(...), { ssr: false })` 필수.
6. 열람 로그의 `revealedValue`(당시 표시값)는 분쟁 대응용 — 절대 삭제하지 않는 불변 데이터로 취급.
7. 커밋 컨벤션: `feat:` `fix:` `docs:` `i18n:` `rules:` (Security Rules 변경은 별도 prefix로 리뷰 강화).

## 5. Security Rules 배포 & 테스트

```bash
firebase init firestore          # rules 파일 생성
firebase emulators:start         # 로컬 에뮬레이터
npm run test:rules               # rules 단위 테스트 (secrets 직접 read 차단 검증 필수)
firebase deploy --only firestore:rules
```

## 6. 파비콘 제작 가이드

- 컨셉: 둥근 지도 핀 안에 남/여 화장실 픽토그램 + 열린 자물쇠, 브랜드 컬러 (신뢰의 블루 #2563EB + 화이트)
- SVG 원본 → https://realfavicongenerator.net 로 ico/apple-touch-icon/manifest 아이콘 일괄 생성
- `app/[locale]/layout.tsx` metadata: title "Korea Toilet Sharing Service | 코리아 토일럿 쉐어링", description 4개 언어 대응

## 7. 배포 체크리스트

- [ ] 환경 변수 전부 Vercel 등록 (Admin Key는 절대 NEXT_PUBLIC 금지)
- [ ] Kakao Redirect URI에 프로덕션 도메인 추가
- [ ] Firestore Rules 프로덕션 배포 + secrets 차단 검증
- [ ] 위치정보/개인정보 수집 동의 문구 4개 언어 노출 확인
- [ ] Lighthouse 모바일 성능 80+ / PWA 설치 가능 확인
- [ ] OSM 타일 usage policy 준수 (User-Agent, 트래픽)

## 8. 트러블슈팅 메모

| 증상 | 원인/해결 |
|---|---|
| Leaflet 마커 아이콘 깨짐 | 기본 아이콘 경로 문제 → `L.icon` 커스텀 지정 |
| window is not defined | Leaflet SSR → dynamic import ssr:false |
| 카카오 로그인 후 Firebase 세션 없음 | Custom Token 교환 단계 누락 확인 |
| 반경 쿼리 누락 빌딩 | geohash 경계 셀 → geofire-common queryBounds 전체 순회 필요 |
