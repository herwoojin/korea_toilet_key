# TASK — Korea Toilet Sharing Service 작업 목록

> 한 번에 하나씩(one-task-at-a-time) 실행 가능한 단위로 분해
> 상태: ⬜ 대기 / 🔄 진행 / ✅ 완료
> **2026-07-19 업데이트**: 개발서버(local) 단계 완료. 🔄 표시는 코드 구현 완료 + Firebase/Kakao 환경변수 입력 후 실검증 필요 항목. → `ENV_SETUP_GUIDE.md` 참고

---

## Phase 0 — 프로젝트 기반 (예상 0.5일)

- ✅ **T-001** Next.js 14 + TS + Tailwind + shadcn/ui 프로젝트 생성, 기본 레이아웃/테마 설정
- ✅ **T-002** `lib/firebase/client.ts` / `admin.ts` 작성, `.env.example`/`.env.local` 세팅 (Firebase 콘솔 프로젝트 생성은 사용자 작업 — GUIDE §1.1)
- ✅ **T-003** 파비콘·로고 SVG 제작 및 metadata(title/description/manifest) 적용
- ✅ **T-004** next-intl 셋업: `/[locale]` 라우팅, ko/en/zh/ja 메시지 파일, LanguageSwitcher 컴포넌트

## Phase 1 — 지도 & 빌딩 (예상 1.5일)

- ✅ **T-101** MapProvider 인터페이스 + LeafletProvider(OSM) 구현, 메인 지도 화면 렌더
- ✅ **T-102** GPS 현재 위치 취득 + LocateButton + 권한 거부 시 주소 검색 폴백 UI
- ✅ **T-103** `/api/geocode` — Kakao Local API 프록시 (KAKAO_REST_API_KEY 입력 시 동작)
- ✅ **T-104** buildings 컬렉션 타입/스키마 정의, geohash 저장 유틸(`lib/geo.ts`)
- ✅ **T-105** 반경 지오쿼리로 주변 빌딩 마커 표시 + 마커 클릭 → 빌딩 상세 시트 (+ 시드 스크립트 `npm run seed`, env 없으면 데모 데이터)
- ✅ **T-106** 빌딩 상세 화면: 남/여 ToiletCard, 위치 설명, ConfidenceBadge, 업데이트 시각

## Phase 2 — 인증 & 열람 핵심 (예상 2일)

- 🔄 **T-201** Google 로그인 (Firebase Auth) + users 문서 생성 + LoginSheet UI — 코드 완료, env 입력 후 실검증
- 🔄 **T-202** Kakao 로그인 — Custom Token 방식 구현 완료 (`/api/auth/kakao/start`→인가→`/callback`→커스텀 토큰). Kakao 콘솔에서 로그인 활성화 + Redirect URI 등록 후 실검증
- 🔄 **T-203** 에티켓 서약 모달 (최초 1회, 4개 언어) + users.etiquetteAgreedAt 저장 — 코드 완료
- 🔄 **T-204** ★ `/api/reveal` — 트랜잭션: viewLogs 기록 → secrets 반환. RevealButton UI — 코드 완료, env 입력 후 실검증
- 🔄 **T-205** Firestore Security Rules 작성 완료(`firestore.rules`) — 에뮬레이터 rules 테스트 미작성 (secrets 차단 검증 필수)
- 🔄 **T-206** 열람 후 FeedbackButtons + `/api/feedback` — 코드 완료

## Phase 3 — 제보 & 합의 (예상 1.5일)

- ✅ **T-301** `lib/consensus.ts` 합의 알고리즘 순수함수 + Vitest 테스트 8개 통과 (TRD §3.4 공식)
- 🔄 **T-302** 제보 화면: 주소 검색 → 위치 선택 → 남/여 비밀번호 입력 폼 — 코드 완료 (기존 빌딩 선택 UI는 보강 여지)
- 🔄 **T-303** `/api/report` — reports 저장 + onsite 판정 + secrets 재계산·캐시 갱신 + 주소 중복 병합 — 코드 완료
- ⬜ **T-304** 신고(flags) 기능: status 'disputed' 처리 + "확인 중" 표시 (표시 UI는 완료, 접수 폼 미구현)

## Phase 4 — 신뢰 강화 (예상 2일)

- ⬜ **T-401** 휴대폰 SMS 본인인증 (Firebase Phone Auth) + phoneVerified 배지 + 제보 가중치 반영
- 🔄 **T-402** 기여 포인트: 무료 3회/제보 +10p/피드백 +2p/열람 차감 로직 + my 페이지 — 서버 로직·my 페이지 완료
- ⬜ **T-403** 오너 인증 신청(owners) 플로우 + 관리자 승인 처리(수동)
- ⬜ **T-404** 오너 대시보드: 열람 로그 조회, ownerOverride 등록, 비공개 전환
- 🔄 **T-405** 내 열람 기록 화면 — "이 시각 사용으로 간주" 안내 포함 (my 페이지에 기본 구현)

## Phase 5 — 다국어 완성 & 온보딩 (예상 1일)

- 🔄 **T-501** 현재 구현된 전 화면 문자열 4개 언어 번역 완료 (이후 신규 화면 추가 시 동시 갱신)
- ✅ **T-502** 외국인 온보딩 "한국 화장실 문화" 페이지 (4개 언어)
- 🔄 **T-503** 언어 수동 전환 유지(localStorage 저장) — 브라우저 자동 감지는 next-intl 미들웨어 기본 동작

## Phase 6 — 마감 & 배포 (예상 1일)

- ⬜ **T-601** PWA 설정(next-pwa): manifest·아이콘은 완료, 서비스워커/홈 화면 배너 미구현
- ⬜ **T-602** Playwright E2E: 로그인→지도→열람→피드백 시나리오
- ⬜ **T-603** 위치정보·개인정보 동의 문구/약관 페이지 (4개 언어)
- ⬜ **T-604** Vercel 프로덕션 배포 + Rules 배포 + Kakao 도메인 등록 + 최종 체크리스트(GUIDE §7)

## 추가 요구사항 (2026-07-19 사용자 요청)

- ✅ **A-001** 첫 로그인 게이트 화면 — 로그인(Google/Kakao) 없이는 앱 진입 불가 (`AppGate`, env 미설정 시 "데모 모드로 둘러보기")
- ✅ **A-002** 실시간 공유 열람 현황 페이지 `/live` — `liveFeed` 컬렉션 onSnapshot 실시간 표 + 새 행 애니메이션, 하단 탭 "실시간" 추가. reveal API가 민감정보 제외 스냅샷을 저장
- ✅ **A-003** 닉네임 설정 — 내정보 > 설정에서 닉네임 변경 (users.nickname)
- ✅ **A-004** 위치 권한 필수 게이트 — 허용해야만 앱 사용 가능 (거부 시 재허용 안내 화면)

## Phase 7 — v2 백로그 (배포 후)

- ⬜ **T-701** KakaoProvider 지도 구현 및 env 전환 (스텁 파일 존재)
- ⬜ **T-702** 체류시간 검증 (PWA 포그라운드 좌표 샘플링)
- ⬜ **T-703** 서울시 공공화장실 공공데이터 연동
- ⬜ **T-704** 매너 점수(trustScore) 산정·제한 로직
- ⬜ **T-705** 실명 본인확인(PASS 등) 유료 연동 검토

---

### 의존 관계 요약
```
T-001~004 → T-101~106 → T-201~206 → T-301~304 → T-401~405 → T-501~503 → T-601~604
(T-301 consensus는 T-303보다 선행 / T-205 Rules는 T-204와 동시 진행 권장)
```

### 실행 방법 (개발서버)
```bash
cd korea-toilet-share
npm run dev        # http://localhost:3000 → /ko (env 없으면 데모 모드)
npm test           # 합의 알고리즘 단위 테스트
npm run seed       # FIREBASE_ADMIN_KEY 설정 후 데모 빌딩 10개 시드
```
