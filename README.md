# Korea Toilet Sharing Service (코리아 토일럿 쉐어링)

대한민국 상가·빌딩의 남녀 화장실 위치와 출입 비밀번호를 지도에서 확인하는, **"기록이 남는 신뢰 기반 열람"** 크라우드소싱 웹앱.

- 앱 소스: [`korea-toilet-share/`](korea-toilet-share/) — Next.js 14 + Firebase(Auth/Firestore) + Leaflet(OSM) + next-intl(ko/en/zh/ja)
- 기획 문서: [PRD](PRD.md) · [TRD](TRD.md) · [ERD](ERD.md) · [GUIDE](GUIDE.md) · [PLAN](PLAN.md) · [TASK](TASK.md)
- 환경변수 설정: [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)
- 배포(Netlify): [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

## 빠른 시작

```bash
cd korea-toilet-share
npm install
npm run dev     # http://localhost:3000 (env 없으면 데모 모드)
npm test        # 합의 알고리즘 단위 테스트
npm run seed    # Firestore에 데모 빌딩 10개 시드 (Admin 자격 필요)
```

## 핵심 원칙

1. 비밀번호 원문은 `secrets` 컬렉션(서버 전용) — 클라이언트는 절대 직접 읽지 못하며, `/api/reveal`이 열람 로그를 트랜잭션으로 기록한 후에만 반환
2. 로그인(Google/Kakao) + 위치 권한 허용 필수
3. 모든 열람은 `/live` 실시간 피드에 공유되고 영구 저장
