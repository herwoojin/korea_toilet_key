# 🔑 환경변수 설정 설명서 (아주 쉬운 버전)

> 파일 위치: **`korea-toilet-share/.env.local`** ← 여기에 값을 채워 넣으면 됩니다.
> 지금은 값이 비어 있어도 **데모 모드**로 잘 돌아갑니다. 값을 채우는 만큼 진짜 기능이 켜집니다.

---

## 한눈에 보기 — 뭘 넣으면 뭐가 켜지나?

| 채울 값 | 켜지는 기능 | 어디서 받나 |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` 6개 | Google 로그인, 실제 빌딩 데이터 | Firebase 콘솔 |
| `FIREBASE_ADMIN_KEY` 1개 | ★비밀번호 열람/제보/시드 데이터 | Firebase 콘솔 (서비스 계정) |
| `KAKAO_REST_API_KEY` 1개 | 주소 검색 | Kakao Developers |
| `NEXT_PUBLIC_KAKAO_JS_KEY` 1개 | (나중에) 카카오 로그인·카카오맵 | Kakao Developers |
| `NEXT_PUBLIC_MAP_PROVIDER` | 이미 `osm`으로 설정됨 — 건드릴 필요 없음 | - |
| `SERVER_MEMORY_BUDGET_MB` | 이미 설정됨 — 건드릴 필요 없음 | - |

---

## 1단계. Firebase 클라이언트 값 6개 (약 5분)

1. https://console.firebase.google.com 접속 → **프로젝트 추가** → 이름 `korea-toilet-share` (Analytics는 꺼도 됨)
2. 프로젝트 들어가서 왼쪽 위 **⚙️ 프로젝트 설정** 클릭
3. 아래로 내려 **내 앱** → **웹 앱 추가( `</>` 아이콘 )** → 닉네임 아무거나 → 등록
4. 화면에 나오는 `firebaseConfig` 코드에서 값을 그대로 복사:

```
Firebase 화면에 보이는 것        →  .env.local 에 넣을 곳
──────────────────────────────────────────────────────
apiKey: "AIza..."               →  NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
authDomain: "xxx.firebaseapp.com" →  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
projectId: "korea-toilet-share" →  NEXT_PUBLIC_FIREBASE_PROJECT_ID=korea-toilet-share
storageBucket: "xxx.appspot.com" →  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
messagingSenderId: "1234567"    →  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567
appId: "1:1234:web:abcd"        →  NEXT_PUBLIC_FIREBASE_APP_ID=1:1234:web:abcd
```

> 💡 따옴표(`"`)는 빼고, `=` 뒤에 값만 붙여넣으세요. 띄어쓰기 없이.

5. 이어서 콘솔에서 두 가지 켜기:
   - **빌드 → Authentication → 시작하기 → Sign-in method → Google** 사용 설정
   - **빌드 → Firestore Database → 데이터베이스 만들기** → 위치 `asia-northeast3 (서울)` → **프로덕션 모드**

## 2단계. Firebase Admin 키 1개 (약 3분) — ★제일 중요

비밀번호 열람 API가 이 키로 동작합니다. **절대 남에게 공유하거나 커밋하면 안 됩니다.**

1. Firebase 콘솔 → **⚙️ 프로젝트 설정 → 서비스 계정** 탭
2. **새 비공개 키 생성** 버튼 → JSON 파일이 다운로드됨
3. 이 JSON을 **한 줄로** 만들어 넣어야 합니다. 터미널에서 아래 한 줄만 실행하면 자동으로 해줍니다:

```bash
cd korea-toilet-share
node -e "const fs=require('fs');const j=fs.readFileSync(process.argv[1],'utf8');const line='FIREBASE_ADMIN_KEY='+JSON.stringify(JSON.parse(j));const env=fs.readFileSync('.env.local','utf8').replace(/^FIREBASE_ADMIN_KEY=.*$/m,line);fs.writeFileSync('.env.local',env);console.log('✅ FIREBASE_ADMIN_KEY 입력 완료')" ~/Downloads/다운받은파일이름.json
```

> `~/Downloads/다운받은파일이름.json` 부분만 실제 다운로드된 파일 경로로 바꾸세요.
> (수동으로 하려면: JSON 내용 전체를 한 줄로 만들어 `FIREBASE_ADMIN_KEY={"type":"service_account",...}` 형태로 붙여넣기)

## 3단계. Kakao 키 2개 (약 5분)

1. https://developers.kakao.com → 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**
2. 만든 앱 클릭 → **앱 설정 → 앱 키** 화면에서:
   - **REST API 키** 복사 → `KAKAO_REST_API_KEY=여기에`
   - **JavaScript 키** 복사 → `NEXT_PUBLIC_KAKAO_JS_KEY=여기에`
3. **앱 설정 → 플랫폼 → Web 플랫폼 등록** → 사이트 도메인에 `http://localhost:3000` 추가
4. **카카오 로그인을 쓰려면 (추가 3분):**
   - 왼쪽 메뉴 **제품 설정 → 카카오 로그인** → 활성화 **ON**
   - 같은 화면의 **Redirect URI 등록** 버튼 → `http://localhost:3000/api/auth/kakao/callback` 추가
   - **제품 설정 → 카카오 로그인 → 동의항목** → "닉네임(프로필 정보)"을 **필수 동의**로 설정

> 💡 주소 검색과 카카오 로그인 모두 **REST API 키** 하나로 동작합니다 (코드가 서버에서만 사용).
> 💡 카카오 로그인은 Firebase Custom Token을 발급하므로 **2단계의 FIREBASE_ADMIN_KEY도 필요**합니다.

## 4단계. 값 넣은 뒤 할 일

```bash
cd korea-toilet-share

# 1) 개발서버 재시작 (env 반영)
npm run dev            # → http://localhost:3000

# 2) 데모 빌딩 10개를 진짜 Firestore에 넣기 (Admin 키 필요)
npm run seed

# 3) Security Rules 배포 (firebase CLI 설치되어 있다면)
npx firebase-tools deploy --only firestore:rules --project 프로젝트ID
```

## 자주 걸리는 문제

| 증상 | 해결 |
|---|---|
| 로그인 팝업이 바로 닫힘 | Firebase 콘솔 → Authentication → 설정 → 승인된 도메인에 `localhost` 있는지 확인 |
| 열람 버튼에 "서버에 Firebase Admin 키가…" | 2단계 다시 확인 + 개발서버 재시작 |
| 주소 검색이 안 됨 | `KAKAO_REST_API_KEY` 확인 (JavaScript 키와 헷갈리지 않기) |
| 카카오 로그인 버튼 누르면 에러로 돌아옴 | ① REST API 키 확인 ② Redirect URI(`/api/auth/kakao/callback`) 등록 확인 ③ FIREBASE_ADMIN_KEY 확인 |
| 지도에 빌딩이 안 보임 | `npm run seed` 실행했는지 확인, 지도를 강남역 근처로 이동 |
| 값을 바꿨는데 반영 안 됨 | 개발서버 껐다 다시 `npm run dev` |
