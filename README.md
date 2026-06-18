# TQQQ Drawdown Monitor

TQQQ가 전고점에서 현재 몇 % 빠졌는지를 큰 숫자 하나로 보여주는 단일 페이지. 기획서는 `crash-is-coming.md`.

## 데이터 정책

기본은 운영자가 `/admin`에서 매일 TQQQ split-adjusted 종가를 직접 입력하는 manual 모드. `DATA_PROVIDER=yahoo`로 전환하면 Vercel Cron이 매일 Yahoo Finance에서 adjusted close를 가져와 동일한 KV에 저장한다. 두 경로 모두 같은 `tqqq:closes`에 쓰므로 yahoo 모드 중에도 `/admin` 수동 입력으로 즉시 보정할 수 있다 (자동화가 깨졌을 때의 fallback).

ATH·1년 고점은 누적 종가와 시드값을 합쳐 계산된다. 시드값은 항상 **종가(Adjusted Close) 기준**으로 입력한다 — 아래 「시드 ATH 정책」 참조.

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
   - `DATA_PROVIDER` = `manual` (기본) 또는 `yahoo` (자동 수집)
   - `CRON_SECRET` = `yahoo` 사용 시 필수. Vercel Cron이 `Authorization: Bearer <secret>`으로 cron 엔드포인트를 호출
4. **배포** — `git push` 또는 `vercel --prod`. `vercel.json`의 cron이 자동 등록됨

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

### 시드 ATH 정책 (종가 기준 통일)

ATH·1년 고점 시드값은 **항상 split-adjusted 종가(Adjusted Close)** 기준으로 입력한다. 장중 고점(intraday high)이 아니다.

- 누적 종가와 시드를 같은 측정 기준으로 비교해야 드로다운 계산이 일관된다. Yahoo 자동 수집 모드에서 들어오는 값도 adjusted close이므로 시드만 intraday high를 쓰면 ATH가 자동 갱신되지 않거나 어색하게 고정된다.
- 차후 시드값을 재입력할 때(예: 데이터 초기화, 분할 보정 후 일관성 검증)도 **그 시점까지의 종가 기준 역대 최고치**를 사용한다.
- 출처: Yahoo Finance 종목 페이지의 "Historical Data" → "Adj Close" 컬럼.

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

## Provider 전환 (manual ↔ twelvedata)

`DATA_PROVIDER` 환경변수로 어느 경로가 KV에 데이터를 채울지 선택한다.

- `manual` (기본): 운영자가 `/admin`에서 매일 직접 입력. `vercel.json`의 cron은 등록되어 있어도 핸들러 내부에서 200 OK + no-op로 빠져나옴.
- `twelvedata`: 매일 **22:00 UTC** (= 한국 시간 오전 7시)에 `/api/cron/twelvedata`가 [Twelve Data API](https://twelvedata.com/)에서 split-adjusted close를 가져와 `symbols:{ticker}:closes`에 저장. `/admin` 수동 입력 경로는 그대로 살아 있어, 자동화가 깨졌을 때 손으로 입력해 즉시 복구할 수 있다.

### Twelve Data 자동 수집 운영

1. **API key 발급** — https://twelvedata.com 가입 → 무료 플랜 (800 credits/day, 8 req/min). 5종목 × 1회 = 5 credits로 여유.
2. **Discord webhook URL 발급** — Discord 서버 > 채널 > 통합 > 웹훅 만들기 > URL 복사.
3. Vercel 환경변수:
   - `DATA_PROVIDER=twelvedata`
   - `CRON_SECRET=<랜덤 문자열>` (`openssl rand -base64 32`)
   - `TWELVE_DATA_API_KEY=<발급받은 키>`
   - `DISCORD_WEBHOOK_URL=<webhook URL>`
4. `vercel.json`의 cron 2개가 배포와 함께 자동 등록됨. Vercel 대시보드 → Crons 탭에서 활성 상태 확인.

### 로컬 dev에서 cron 수동 호출 (테스트)

`.env.local`에 `DATA_PROVIDER=twelvedata`, `CRON_SECRET=test`, `TWELVE_DATA_API_KEY=<실키>`, `DISCORD_WEBHOOK_URL=<테스트 채널 webhook>` 설정 후:

```bash
# 메인 cron: 5종목 종가 fetch + KV 저장
curl -H "Authorization: Bearer test" http://localhost:3000/api/cron/twelvedata

# 감시 cron: lastSuccess.date 누락 종목 점검 + Discord 알림
curl -H "Authorization: Bearer test" http://localhost:3000/api/cron/watchdog
```

응답 예시 (메인 cron 성공):
```json
{ "ok": true, "results": [{ "ticker": "tqqq", "ok": true, "written": { "date": "2026-06-17", "price": 72.93 } }, ...] }
```

응답 예시 (감시 cron):
```json
{ "ok": true, "expected": "2026-06-17", "missing": [], "notified": false }
```

### 배포 후 첫 cron 실행 확인

1. 다음날 KST 07:05 즈음 `/admin` 접속 → "수집 상태" 카드에서 "최근 성공: <시각> · <date> 종가 <price>" 표시 확인
2. 안 보이면: Vercel 대시보드 → 해당 프로젝트 → Logs → `/api/cron/twelvedata` 실행 로그 점검
3. KST 12:00 이후 감시 cron이 자동 catch — 메인 cron 실행 안 됐으면 Discord에 감시 알림 도착

### 안전장치 4중 구조

1. **수집 상태 카드** — `/admin` 최상단의 "수집 상태" 카드에서 마지막 성공/실패 시각·메시지·연속 실패 횟수 + 최근 14일 성공률(95%/90% 컬러 코딩) 표시. 매일 한 번 admin 방문 시 즉시 인지.
2. **stale 큰 경고 (메인 페이지)** — 직전 미국 거래일 마감 + `STALE_CRITICAL_HOURS_AFTER_CLOSE`(기본 3시간)가 지나도 KV에 그날 종가가 없으면 메인 페이지 상단에 빨간 배너 자동 노출. KST 09:00 즈음 발화. NYSE 휴장일·주말은 거래일에서 제외 — 오탐 없음.
3. **Discord 알림 (3종)** —
   - **실패 알림**: 연속 2회 실패부터, 24시간 1통 한도 (`IngestStatus.lastNotifyAt` 디둡).
   - **복구 알림**: 직전이 알림 발송된 실패 상태였을 때만 1통 (`pendingRecovery` 플래그).
   - **감시 알림 (dead man's switch)**: 별도 cron `/api/cron/watchdog`가 매일 **03:00 UTC** (12:00 KST) 실행. 메인 cron 자체가 실행 안 됐을 가능성을 catch — 종목별 마지막 성공 날짜가 직전 거래일에 미달이면 1통 합쳐 발송. 시스템 전역 24h 디둡 (KV `system:watchdog:lastNotifyAt`).
4. **수동 입력 fallback** — auto 모드 중에도 `/admin`의 종가 입력 폼은 그대로 동작하고, 같은 KV에 쓰므로 cron이 채운 값을 운영자가 덮어쓸 수 있음. 자동화 완전 실패 시에도 즉시 복구 가능.

### 14일 후 ROI 판단

`/admin` 수집 상태 카드의 14일 성공률 기준:
- **≥ 95%** → Twelve Data 무료 유지
- **90~95%** → 알림이 잘 작동하는지 보고 결정
- **< 90%** → Polygon $29/월 ([polygon.io](https://polygon.io)) 업그레이드 검토. SLA + institutional grade 분할 보정.

### 환경변수 fallback 동작

- `TWELVE_DATA_API_KEY` 미설정 + `DATA_PROVIDER=twelvedata` → cron 시작 시점에 Discord 알림 + 500 응답 (즉시 운영자 인지)
- `DISCORD_WEBHOOK_URL` 미설정 → console.warn 후 알림 silent (Vercel logs로만 확인 가능)
- 둘 다 미설정 → console.error fallback. 배포 전 미리 점검 필요.

## 의도적 제약 (기획서 §9)

- TQQQ 외 종목 추가 ❌
- split 미보정 raw 종가 입력 ❌ (입력자가 split-adjusted 값만 입력)
- 매수/매도 신호·권유 문구 ❌
- 회원 시스템 ❌ (`ADMIN_TOKEN`은 단일 비밀번호일 뿐, 사용자 계정 아님)
- API 키 프론트엔드 노출 ❌

## 디렉토리

`crash-is-coming.md` — 기획서  
`src/app/` — 페이지·서버 액션 (`api/cron/yahoo/route.ts`는 일일 스크래핑 cron 핸들러)  
`src/components/` — UI 컴포넌트 (`StaleCriticalBanner`, `admin/IngestStatusCard`)  
`src/lib/providers/` — 데이터 소스 추상화 (`manual.ts`, `yahoo.ts`는 둘 다 KV 기반 read; `yahoo.ts`만 `getIngestStatus()` 노출)  
`src/lib/ingest/` — Yahoo fetch·파싱, 수집 상태 KV 갱신  
`src/lib/nyse-calendar.ts` — NYSE 휴장일 (하드코딩 2026–2028) + 거래일 유틸  
`src/lib/staleness.ts` — 거래일 기준 fresh/soft/critical 판정  
`src/lib/` — 순수 계산·검증·포맷 모듈 (테스트 동봉)  
`src/constants/` — 색상 임계값, 신선도 임계값  
`src/middleware.ts` — `/admin` 접근 제어  
`vercel.json` — daily cron 스케줄 (`0 22 * * *`)
# crashIsComing
