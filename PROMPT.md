# PROMPT — Korea Toilet Sharing Service AI 코딩 프롬프트

> Claude Code / Antigravity에서 태스크별로 복사해 사용하는 실행 프롬프트
> 사용법: 공통 컨텍스트를 세션 시작 시 1회 입력 → 태스크 프롬프트를 순서대로 하나씩 실행

---

## 0. 공통 컨텍스트 (세션 시작 시 1회)

```
너는 "Korea Toilet Sharing Service" 웹앱의 시니어 풀스택 개발자야.
프로젝트 문서: PRD.md, TRD.md, ERD.md, GUIDE.md를 먼저 읽고 시작해.

핵심 규칙:
1. 스택: Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui + Firebase(Auth/Firestore) + Leaflet(OSM) + next-intl
2. 비밀번호 원문은 절대 클라이언트가 Firestore에서 직접 읽지 못한다. 반드시 /api/reveal 경유, 열람 로그 기록 후 반환.
3. 지도는 MapProvider 인터페이스로 추상화 (Leaflet 기본, Kakao 교체 가능)
4. 모든 UI 문자열은 messages/{ko,en,zh,ja}.json 경유. 하드코딩 금지.
5. 한 번에 하나의 태스크만 수행하고, 완료 후 변경 파일 목록과 검증 방법을 보고해.
6. 모바일 우선 반응형. Leaflet은 dynamic import (ssr: false).
```

## T-001 프로젝트 생성
```
TASK.md의 T-001을 수행해.
Next.js 14(App Router, TS, Tailwind) 프로젝트를 생성하고 shadcn/ui를 초기화해.
브랜드 컬러 #2563EB 기반 테마, 모바일 우선 기본 레이아웃(상단 로고 + 하단 탭바: 지도/제보/내정보)을 만들어.
```

## T-002 Firebase 연동
```
T-002를 수행해. lib/firebase/client.ts(클라이언트 SDK 초기화)와 lib/firebase/admin.ts(Admin SDK, 서버 전용)를 작성해.
환경 변수는 TRD §4 목록을 따르고 .env.example 파일도 만들어. Admin 키가 클라이언트 번들에 포함되지 않음을 확인해.
```

## T-003 파비콘·브랜딩
```
T-003을 수행해. "지도 핀 + 남녀 화장실 픽토그램 + 열린 자물쇠"를 결합한 SVG 로고/파비콘을 직접 SVG 코드로 제작해.
컬러는 #2563EB + 흰색. app 레벨 metadata에 title "Korea Toilet Sharing Service | 코리아 토일럿 쉐어링"과
4개 언어 description, manifest용 아이콘(192/512)을 적용해.
```

## T-004 i18n 셋업
```
T-004를 수행해. next-intl로 /[locale] 라우팅(ko 기본, en/zh/ja)을 구성하고
messages 4개 파일 스캐폴드와 LanguageSwitcher(국기 없이 언어명 텍스트) 컴포넌트를 만들어.
브라우저 언어 자동 감지 + localStorage 수동 선택 유지.
```

## T-101 지도 렌더
```
T-101을 수행해. lib/map/MapProvider.ts 인터페이스(TRD §3.1)를 정의하고
LeafletProvider를 react-leaflet + OSM 타일로 구현해. 메인 페이지에서 지도가 전체 화면으로 렌더되게 해.
dynamic import ssr:false 필수. NEXT_PUBLIC_MAP_PROVIDER=osm 로 프로바이더 선택.
```

## T-102 GPS 위치
```
T-102를 수행해. navigator.geolocation으로 현재 위치를 잡아 지도 중심 이동 + 내 위치 마커를 표시하고,
우측 하단 LocateButton을 추가해. 권한 거부 시 상단에 주소 검색 입력으로 폴백하는 안내 배너를 4개 언어로 노출해.
```

## T-103 지오코딩 프록시
```
T-103을 수행해. /api/geocode Route Handler에서 Kakao Local REST API(주소 검색, 키워드 검색)를 프록시해.
REST 키는 서버 환경 변수로만 사용. 검색 UI 컴포넌트에서 결과 선택 시 지도가 해당 좌표로 이동하게 해.
```

## T-104~105 빌딩 데이터 & 반경 쿼리
```
T-104와 T-105를 수행해. ERD.md의 buildings 스키마대로 TypeScript 타입을 정의하고,
geofire-common으로 geohash 저장/반경(기본 500m, 최대 2km) 쿼리 유틸을 lib/geo.ts에 작성해.
지도 이동 시 보이는 영역의 빌딩을 마커로 표시하고, 마커 클릭 시 하단 시트로 빌딩 요약을 띄워.
개발용 시드 데이터 스크립트(서울 시내 가상 빌딩 10개)도 만들어.
```

## T-106 빌딩 상세
```
T-106을 수행해. building/[id] 상세 화면에 남/여 ToiletCard(위치 설명, 잠금 여부),
ConfidenceBadge(high/medium/low + 제보 n건·최근 확인일), 업데이트 시각을 표시해.
비밀번호 영역은 "로그인 후 열람 가능" 상태로 가려둬 (열람 API는 T-204에서).
```

## T-201~202 로그인
```
T-201을 수행해: Firebase Auth Google 로그인 + 최초 로그인 시 users 문서 생성(ERD §2.1 필드, freeReveals=3).
완료 후 T-202: Kakao 로그인을 통합해. 카카오 OIDC를 Firebase OIDC Provider로 등록하는 방식을 먼저 시도하고,
불가하면 인가코드 → 서버 토큰 검증 → Admin SDK Custom Token 방식으로 구현해 (TRD §3.2).
```

## T-203 에티켓 서약
```
T-203을 수행해. 최초 비밀번호 열람 시도 전에 1회 표시되는 EtiquettePledgeModal을 만들어.
내용: 깨끗한 사용, 상업시설 존중, 열람=사용 간주 및 기록 고지. 4개 언어. 동의 시 users.etiquetteAgreedAt 저장.
```

## T-204 ★ 열람 API (최중요)
```
T-204를 수행해. /api/reveal Route Handler를 작성해.
순서: ① Firebase ID 토큰 검증 ② etiquetteAgreedAt 확인 ③ freeReveals 또는 points 잔액 확인
④ Firestore 트랜잭션으로 viewLogs 생성(ERD §2.5 전체 필드, 클라이언트가 보낸 GPS로 distanceM 계산)
⑤ secrets/{buildingId}에서 해당 성별 current 반환 (ownerOverride 존재 시 그 값).
로그 기록 실패 시 비밀번호를 절대 반환하지 마.
클라이언트 RevealButton: 가림 → 탭 → "열람 기록이 남습니다" 컨펌 → 표시.
```

## T-205 Security Rules
```
T-205를 수행해. ERD §4 접근 제어 매트릭스대로 firestore.rules를 작성하고,
Firebase Emulator + @firebase/rules-unit-testing으로 테스트를 작성해.
필수 검증: (1) secrets 컬렉션은 어떤 클라이언트도 read 불가 (2) viewLogs는 클라이언트 create 불가
(3) 오너는 자기 빌딩 viewLogs만 read 가능 (4) reports는 update/delete 불가(불변).
```

## T-206 피드백
```
T-206을 수행해. 열람 직후와 내 열람 기록에서 "맞았어요/틀렸어요" FeedbackButtons를 노출하고
/api/feedback에서 feedbacks 저장 + secrets 후보 점수 보정(+0.5/−1.0) + confidence 캐시 갱신을 처리해.
```

## T-301 합의 알고리즘
```
T-301을 수행해. lib/consensus.ts에 TRD §3.4 공식의 순수함수를 구현해:
computeConsensus(reports, feedbacks, ownerOverride?) → { current, candidates[], confidence }
Vitest 테스트 먼저 작성: 다수결 승리, 최신성 감쇠, 인증자 가중치, 틀렸어요 누적 시 등급 하락, 오너 오버라이드 최우선.
```

## T-302~303 제보
```
T-302와 T-303을 수행해. 제보 화면(주소 검색 → 기존 빌딩 선택 or 신규 등록 → 남/여 비밀번호·위치설명 입력)과
/api/report(reports 저장, GPS 150m 이내 onsite 판정, consensus 재계산 → secrets/buildings 캐시 갱신, 포인트 +10)를 구현해.
```

## T-304 신고
```
T-304를 수행해. 빌딩 상세에서 신고(잘못된 정보/오너 비공개 요청/악용)를 접수하는 flags 기능을 만들어.
open 상태 flag가 있으면 해당 화장실 status='disputed'로 바꾸고 열람 화면에 "확인 중" 표시로 비밀번호를 가려.
```

## T-401~405 신뢰 강화
```
T-401: Firebase Phone Auth SMS 인증 플로우 + phoneVerified 배지 + 제보 가중치 반영.
T-402: 포인트 이코노미 — 열람 시 freeReveals 우선 차감, 없으면 points 5p 차감. my 페이지에 잔액/내역 표시.
T-403: 오너 인증 신청 폼(사업자등록번호) + owners 문서 + 관리자 수동 승인 안내.
T-404: 오너 대시보드 — 자기 빌딩 열람 로그 테이블(닉네임/인증배지/시각/거리), 공식 비밀번호 등록, 비공개 전환.
T-405: 내 열람 기록 리스트 — "해당 시각 사용으로 간주됩니다" 문구 포함.
각각 별도 세션으로 하나씩 실행해.
```

## T-501~503 다국어 완성
```
T-501~503을 수행해. 전체 messages/ko.json을 기준으로 en/zh/ja를 완역하고,
culture 페이지(한국 화장실 비밀번호 문화 설명 + 서비스 사용법, 4개 언어)를 만들어.
번역 톤: 외국인 관광객 대상 친근한 안내 톤.
```

## T-601~604 마감
```
T-601: next-pwa로 PWA 설정(manifest, 아이콘, 홈 화면 추가 배너).
T-602: Playwright E2E — 로그인→지도→빌딩 상세→열람 컨펌→비밀번호 표시→피드백 시나리오 1개.
T-603: 위치정보/개인정보 수집·이용 동의 및 서비스 고지 페이지(4개 언어).
T-604: 프로덕션 배포 체크리스트(GUIDE §7)를 하나씩 검증하고 결과를 보고해.
```
