# TQQQ Drawdown Monitor

TQQQ가 전고점에서 현재 몇 % 빠졌는지를 큰 숫자 하나로 보여주는 단일 페이지. 기획서는 `crash-is-coming.md`.

## 1단계 MVP 데이터 정책

1단계에서는 외부 시세 API를 사용하지 않고, 관리자가 **매일 TQQQ split-adjusted 종가**를 `/admin`에서 직접 입력한다. ATH·1년 고점은 누적 입력값과 시드값을 합쳐 계산된다. 약관 문제를 우회하기 위한 의도적 선택. provider 추상화를 통해 향후 유료 API로 교체 가능.

## 로컬 실행

```bash
cp .env.local.example .env.local
# .env.local 편집: ADMIN_TOKEN 설정. 로컬 테스트라면 KV 변수는 비워둬도 됨 (KV 호출 시 에러는 페이지가 "데이터 준비 중"으로 폴백)
npm install
npm run dev
# http://localhost:3000 (메인) / http://localhost:3000/admin (관리자)
```

로컬에서 KV를 함께 테스트하려면 Vercel KV 환경변수(`KV_REST_API_URL`, `KV_REST_API_TOKEN`)를 `.env.local`에 채운다.

> **개발 모드 fallback**: KV 환경변수가 비어 있으면 자동으로 프로젝트 루트의 `.dev-store.json` 파일에 저장된다. KV 인프라 없이도 `/admin`에서 시드·종가 입력 → 메인 페이지 큰 숫자까지 e2e로 확인할 수 있다. 운영(Vercel)에서는 KV가 자동 주입되어 이 파일은 사용되지 않는다. `.dev-store.json`은 `.gitignore`에 포함됨.

```bash
npm test          # 단위 테스트
npm run build     # 프로덕션 빌드
npm run lint      # ESLint
```

## Vercel 배포

1. **Vercel 프로젝트 연결** — `vercel link` 또는 대시보드에서 import
2. **Storage 추가** — Marketplace에서 Redis 통합(이전의 Vercel KV) 설치. `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`이 자동 주입됨
3. **환경변수 설정**:
   - `ADMIN_TOKEN` = 예측 불가능한 긴 랜덤 문자열 (예: `openssl rand -base64 32`)
   - `DATA_PROVIDER` = `manual`
4. **배포** — `git push` 또는 `vercel --prod`

> 참고: `@vercel/kv` SDK는 deprecated되었지만 현재도 동작한다. 통합은 자동으로 Upstash Redis로 매핑된다. 추후 `@upstash/redis`로 마이그레이션 시 `src/lib/kv.ts`만 교체하면 된다 — 다른 모듈에 영향 없음.

## 운영 절차

### 매 거래일 종가 입력

1. 미국 장 마감 후 TQQQ의 **그날 종가**를 신뢰 가능한 출처(Yahoo Finance, 브로커 앱 등)에서 확인
2. `/admin/login` → 토큰 입력 → `/admin`
3. "종가 추가" 폼에서 날짜 + 종가를 입력하고 저장
4. 입력값이 **전일 종가 대비 ±30% 초과**이면 경고가 뜬다. 오타가 아닌지 다시 확인 후 "확인하고 저장"
5. 같은 날짜에 이미 값이 있으면 덮어쓰기 확인을 요청한다 (재저장 시 갱신)
6. 마지막 입력 후 3일이 지나면 메인 페이지에 "데이터가 오래되었습니다" 경고가 자동으로 표시된다

### 초기 시드값 입력 (서비스 시작 시 1회)

1. `/admin`의 "시드값(초기 ATH / 1년 고점)" 폼
2. **ATH**: TQQQ의 split-adjusted 역대 최고 종가와 그 날짜 (Yahoo Finance의 adjusted close 시계열에서 확인)
3. **1년 고점**: 최근 365일의 split-adjusted 최고 종가와 날짜
4. 누적 입력값이 시드를 초과하면 ATH·1년 고점이 자동으로 갱신된다 (시드는 부트스트랩용)

### 분할(스플릿) 발생 시 보정 절차 ★중요★

TQQQ는 과거에 분할이 있었고 앞으로 또 발생할 수 있다. **분할 발효일 이전에 입력해둔 종가는 옛 기준**이므로, 보정하지 않으면 ATH와 모든 드로다운 계산이 완전히 틀어진다.

1. 분할 공시 확인 (ProShares 공식 공시 또는 거래소 발표) → 발효일과 비율 파악
   - 예: "2:1 split, effective 2026-08-15" → ratio = 2, effectiveDate = 2026-08-15
2. 분할 발효일 **장 마감 후, 다음 거래일 종가를 입력하기 전에** `/admin`의 "분할 일괄 보정" 폼으로 이동
3. 비율과 발효일을 입력하고 **"미리보기"** 클릭
   - 영향받는 항목 수와 변경 예시 3건을 확인할 수 있다
   - 시드값도 함께 보정된다 (발효일 이전 시드만)
4. 미리보기가 맞으면 **"확인하고 적용"** 클릭
5. 분할 후 첫 거래일 종가를 정상 입력 (이미 분할 후 기준 가격이므로 그대로 입력)
6. 의심스러우면 관리자 페이지 하단의 "최근 보정 로그"로 역추적

> 분할 보정은 단방향 작업이며, 실수로 두 번 적용하면 가격이 두 번 나눠진다. 미리보기 단계에서 반드시 확인하자.

## 의도적 제약 (기획서 §9)

- TQQQ 외 종목 추가 ❌
- split 미보정 raw 종가 입력 ❌ (입력자가 split-adjusted 값만 입력)
- 매수/매도 신호·권유 문구 ❌
- 회원 시스템 ❌ (`ADMIN_TOKEN`은 단일 비밀번호일 뿐, 사용자 계정 아님)
- API 키 프론트엔드 노출 ❌

## 디렉토리

`crash-is-coming.md` — 기획서  
`src/app/` — 페이지·서버 액션  
`src/components/` — UI 컴포넌트  
`src/lib/providers/` — 데이터 소스 추상화 (`manual.ts`는 KV 기반)  
`src/lib/` — 순수 계산·검증·포맷 모듈 (테스트 동봉)  
`src/constants/` — 색상 임계값, 신선도 임계값  
`src/middleware.ts` — `/admin` 접근 제어
# crashIsComing
