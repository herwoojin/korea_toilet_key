# 🚀 Netlify 배포 가이드 (아주 쉬운 버전)

> GitHub 저장소: https://github.com/herwoojin/korea_toilet_key
> 배포 설정 파일(`netlify.toml`)은 이미 저장소에 포함되어 있어서, 아래 순서대로 클릭만 하면 됩니다.

---

## 1단계. Netlify에서 사이트 만들기 (약 3분)

1. https://app.netlify.com 접속 → GitHub 계정으로 로그인
2. **Add new site → Import an existing project → GitHub** 선택
3. 저장소 목록에서 **herwoojin/korea_toilet_key** 선택
4. 빌드 설정 화면은 **아무것도 바꾸지 말 것** — `netlify.toml`이 자동 적용됨
   (Base directory: `korea-toilet-share`, Build command: `npm run build`, Publish: `.next`)
5. 아직 **Deploy 버튼을 누르지 말고**, 먼저 아래 2단계 환경변수부터 등록 (또는 배포 후 등록하고 재배포해도 됨)

## 2단계. 환경변수 등록 — ★가장 중요

**Site configuration → Environment variables → Add a variable** 에서 아래를 전부 등록합니다.
로컬 `korea-toilet-share/.env.local`에 있는 값을 그대로 복사하면 됩니다.

| 키 | 어디서 가져오나 | 필수 여부 |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | .env.local 그대로 | ✅ 필수 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | .env.local 그대로 | ✅ 필수 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | .env.local 그대로 | ✅ 필수 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | .env.local 그대로 | ✅ 필수 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | .env.local 그대로 | ✅ 필수 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | .env.local 그대로 | ✅ 필수 |
| `FIREBASE_ADMIN_KEY` | ⚠️ 아래 "주의" 참고 | ✅ 필수 (열람·제보·카카오 로그인) |
| `KAKAO_REST_API_KEY` | .env.local 그대로 | ✅ 필수 (주소검색·카카오 로그인) |
| `KAKAO_CLIENT_SECRET` | .env.local 그대로 | 카카오 콘솔에서 시크릿 켰다면 필수 |
| `NEXT_PUBLIC_MAP_PROVIDER` | `osm` | ✅ 필수 |
| `SERVER_MEMORY_BUDGET_MB` | `1024` | 권장 |

> ⚠️ **FIREBASE_ADMIN_KEY 주의**: 로컬에서는 gcloud ADC 로그인으로 대신하고 있지만, **Netlify 서버에는 ADC가 없으므로 서비스 계정 JSON이 반드시 필요**합니다.
> Firebase 콘솔 → ⚙️ 프로젝트 설정 → **서비스 계정** → **새 비공개 키 생성** → 다운로드된 JSON 내용 전체를 **한 줄로** 값에 붙여넣기.
> (ENV_SETUP_GUIDE.md 2단계에 한 줄로 만드는 명령어가 있습니다 — 거기서 만든 한 줄을 복사)

## 3단계. Deploy 누르고 도메인 확인

1. **Deploy site** 클릭 → 2~4분 후 빌드 완료
2. 발급된 주소 확인 (예: `https://korea-toilet-key.netlify.app`) — 아래 4단계에서 이 주소를 사용
3. 원하면 **Site configuration → Change site name** 으로 주소 변경 가능

## 4단계. 배포 도메인을 외부 서비스에 등록 — 로그인이 되려면 필수!

배포 주소를 `https://내사이트.netlify.app` 이라고 하면:

### Firebase (구글 로그인용)
- Firebase 콘솔 → **Authentication → 설정 → 승인된 도메인 → 도메인 추가** → `내사이트.netlify.app` 입력

### Kakao Developers (카카오 로그인·주소검색용)
- **앱 설정 → 플랫폼 → Web** → 사이트 도메인에 `https://내사이트.netlify.app` 추가
- **제품 설정 → 카카오 로그인 → Redirect URI** → `https://내사이트.netlify.app/api/auth/kakao/callback` 추가

### Firestore Security Rules 배포 (아직 안 했다면)
```bash
cd korea-toilet-share
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project 프로젝트ID
```

## 5단계. 최종 확인 체크리스트

| # | 확인 항목 | 방법 |
|---|---|---|
| 1 | 첫 로그인 화면 | 배포 주소 접속 → 로그인 화면부터 나오는지 |
| 2 | 구글 로그인 | "Google로 계속하기" → 팝업 로그인 → 지도 진입 |
| 3 | 카카오 로그인 | "카카오로 계속하기" → 카카오 동의 → 지도 진입 |
| 4 | 위치 권한 게이트 | 로그인 후 위치 허용 요청 → 거부하면 차단 화면 |
| 5 | 구글 저장소(Firestore) 데이터 | Firebase 콘솔 → Firestore Database → `users` 문서 생김 확인. `npm run seed` 후 `buildings`/`secrets` 확인 |
| 6 | 비밀번호 열람 + 실시간 피드 | 지도 → 빌딩 → 비밀번호 보기 → `/live` 탭에 실시간으로 행 추가 + Firestore `viewLogs`/`liveFeed`에 기록 확인 |
| 7 | 닉네임 변경 | 내정보 → 설정 → 닉네임 저장 → `/live`에 새 닉네임 반영 |

## 문제 해결

| 증상 | 해결 |
|---|---|
| 빌드 실패 | Netlify Deploys 로그 확인 — 대부분 환경변수 누락 |
| 구글 로그인 팝업 차단/실패 | Firebase 승인된 도메인에 netlify 주소 추가했는지 (4단계) |
| 카카오 로그인 후 에러로 돌아옴 | Redirect URI에 **https 배포 주소** 정확히 등록했는지, `KAKAO_CLIENT_SECRET` 등록했는지 |
| 열람 시 "Admin 키" 에러 | Netlify에 `FIREBASE_ADMIN_KEY` 등록 후 **재배포** (Deploys → Trigger deploy) |
| 환경변수 바꿨는데 그대로 | 환경변수 변경 후에는 반드시 재배포 필요 |
