# 작업지시서 v3 — '폭락장은 온다' (TQQQ 드로다운 모니터)

> 이 문서는 현재까지 확정된 모든 결정을 통합한 최신 기준 문서다. v1·v2는 폐기한다.
> 주요 변경 이력은 문서 끝 참고.

## 0. 한 줄 정의

TQQQ가 고점에서 현재 몇 % 빠졌는지를 보여주는 단일 목적의 웹 서비스. 사용자가 페이지를 열자마자 "지금 −○○%"라는 큰 숫자 하나로 상황을 파악하게 만드는 것이 핵심이다. 큰 숫자가 항상 화면의 주인공이며, 나머지 요소는 그 아래에 둔다.

## 1. 핵심 사양 (확정 사항)

- **대상 종목:** TQQQ (ProShares UltraPro QQQ). 단일 종목 유지.
- **고점 기준:** 전고점(ATH)과 최근 1년 고점 — 둘 다 표시. ATH가 메인.
- **데이터 방식:** 운영자가 매일 TQQQ 종가를 **수동 입력**. 1단계에서는 외부 시세 API를 쓰지 않는다.
- **갱신 기준:** "입력된 종가 기준". 실시간/지연 시세 아님.
- **서비스 성격:** 정보 제공 중심. 매수/매도 신호·투자 권유·"지금이 기회" 류 문구는 넣지 않는다.
- **호스팅:** Vercel.
- **프레임워크:** Next.js (App Router, TypeScript).
- **UI 언어:** 한·영 토글. 모든 사용자 노출 텍스트는 i18n 사전 대상.
- **회원 시스템:** 없음. 관리자 접근 보호는 환경변수 토큰 수준으로만.

## 2. 데이터 입력 / 계산 로직

### 2-1. 수동 입력 방식

- 운영자만 접근 가능한 **비공개 관리자 페이지(/admin)**에서 그날의 TQQQ 종가를 입력한다.
- 일반 방문자는 이 페이지에 접근할 수 없다. 접근 보호는 환경변수 기반 토큰(timing-safe 비교) 수준.
- 입력값은 외부 저장소(Vercel KV)에 날짜별로 누적 저장. 로컬 개발 시 KV 환경변수가 없으면 `.dev-store.json` 파일 fallback.
- 폰 브라우저에서도 빠르게 입력 가능하도록 입력 화면은 단순하게.

### 2-2. provider 추상화 (필수)

- 데이터 입구를 `lib/providers/`로 추상화한다. 1단계 구현체는 "수동 입력(manual)" provider.
- 향후 유료 시세 API provider로 **환경변수 교체만으로** 전환 가능해야 한다. 화면·계산 로직은 provider 교체와 무관하게 동작.

### 2-3. 드로다운 계산

세 값만 있으면 된다: 현재 종가, ATH, 최근 1년 고점.

```
ATH 드로다운    = (현재종가 − ATH) / ATH × 100
1년 고점 드로다운 = (현재종가 − 1년고점) / 1년고점 × 100
```

두 값 모두 음수이거나 0이다.

### 2-4. ATH / 1년 고점 산출

- 수동 입력에는 과거 시계열이 없으므로, **초기 기준값(시드)을 운영자가 1회 수동 입력**한다: 시드 ATH(가격·날짜), 시드 1년 고점(가격·날짜).
- 이후 매일 입력되는 종가가 기존 ATH/1년 고점을 넘으면 자동 갱신.
- 1년 고점은 입력 누적 + 시드값을 병합해 최근 365일 범위에서 산출.

> ⚠️ 향후 외부 API provider로 전환 시, split-adjusted(분할 보정) 데이터를 사용해야 ATH가 정확하다.

### 2-5. 입력값 검증 (오타 방어)

- 모든 입력은 zod 스키마로 검증.
- 종가 입력 시 직전 거래일 종가 대비 ±30% 초과 변동이면 경고하고 운영자에게 재확인을 받는다. (잘못된 값이 ATH로 박히면 자동으로 빠지지 않으므로.)

### 2-6. 분할(스플릿) 대응

- TQQQ가 향후 분할하면 기존 입력 종가들이 옛 기준으로 남아 ATH·드로다운이 틀어진다.
- 관리자 페이지에 분할 일괄 보정 기능: 비율 + 발효일 입력 → 발효일 이전 종가·시드를 일괄 조정. 적용 전 미리보기, 작업 로그 기록.
- README에 분할 발생 시 운영 절차를 명시.

## 3. 페이지 구성

공개 단일 페이지 + 비공개 관리자 페이지(/admin). 공개 페이지는 위에서 아래로 스크롤하며 정보가 깊어지는 구조.

### 3-0. 레이아웃

- 데스크톱: 3단 구조 — 왼쪽 사이드(제품 광고, sticky) / 가운데 본문 / 오른쪽 사이드(예비).
- 본문은 가운데 정렬 유지.
- 사이드 폭, 본문-사이드 간격 등 크기 값은 반응형으로(clamp 기반: 최소/비율/최대) 처리하고, 그 값들을 한 곳에 모아 조정이 쉽게 한다. 화면이 커질수록 사이드와 간격이 함께 커지되 한계 안에서.
- 모바일: 좌우 사이드 제거, 광고는 히어로 아래 가로형 배너 하나로.

### 3-1. 히어로 영역 ("믹스 1" 디자인)

가운데 정렬, 위에서 아래로:

1. **TQQQ 배지** — "TQQQ"를 둥근 라벨 박스로. 1차는 회색 톤. 모바일에선 살짝 작게.
2. **기준 라벨** — "전고점(ATH) 대비" / EN "vs. all-time high". (큰 숫자 위에 위치)
3. **큰 드로다운 숫자** — ATH 대비 드로다운. 화면에서 가장 큰 요소. 소수점 1자리 + − 부호.
4. **보조 수치** — "최근 1년 고점 대비 −○○.○%" / EN "vs. 1-year high −○○.○%".
5. **기준 시점** — "○월 ○일 종가 기준" / EN "as of close, [date]".

- 상단 nav와 히어로 사이 여백은 과하지 않게(빈 공간을 절제).

### 3-2. 섹션 1 — 서비스 소개

히어로 아래. 본문 텍스트.

한국어:
"TQQQ는 상품 출시 이후 수많은 폭등과 폭락을 거듭해 왔다. 때로는 투자자들을 공포에 떨게 만드는 최악의 폭락이 있었지만, 시장은 그 뒤로 어김없이 반등했고 결국 그 공포는 최고의 환희를 가져다주었다.
하락장의 한가운데서 감정에 휘둘리지 않고, 진짜 역발상 투자의 기회를 포착하기 위해서는 객관적인 지표가 필요하다고 생각했다. 그래서 감정이 아니라 숫자를 기준으로 시장을 바라보기 위해, 고점 대비 현재 하락률을 한눈에 확인할 수 있는 이 사이트를 만들었다."

English:
"TQQQ has gone through countless surges and crashes since its launch. There have been brutal downturns that left investors gripped by fear — yet the market rebounded each time, and in the end that fear gave way to euphoria.
In the middle of a downturn, staying free of emotion and recognizing a genuine contrarian opportunity calls for an objective gauge. This site was built to look at the market through numbers rather than emotion — to see, at a glance, how far the price has fallen from its peak."

### 3-3. 섹션 2 — 역사적 폭락 (사건별 차트)

TQQQ 역사적 폭락을 사건별 카드로. 다섯 사건, 화면 폭에 따라 2컬럼 그리드.
각 카드: 주가 곡선 형태 + 회복 기간 가로 양쪽 화살표 + 최대 하락률(%)·회복 개월 수 텍스트.

사건 데이터:

- 2011년 미국 신용등급 강등·유럽 재정위기 — −45% / 6개월
- 2015–16년 중국 증시 쇼크·미 금리 인상 우려 — −40% / 11개월
- 2018년 미·중 무역전쟁·양적긴축 — −54% / 7개월
- 2020년 코로나19 팬데믹 — −73% / 5개월
- 2022년 인플레이션·급격한 금리 인상 — −82% / 31개월

구현은 참고 파일 `tqqq_crash_charts_reference.html`을 시각적·동작 기준으로 React 컴포넌트화. 곡선은 고정 시드 기반(새로고침해도 동일). 색상은 프로젝트 테마에 맞춤.

차트 아래 안내 문구(한·영 토글, 실제 서비스에서도 유지):

- KO: "위 곡선은 실제 일별 주가 데이터가 아니라 흐름을 보여주기 위한 형태 예시이며, 최대 하락률과 회복 기간은 근사값이고 곡선의 중간 굴곡은 실제 가격 움직임과 다릅니다."
- EN: "The curves above are illustrative shapes meant to convey the overall movement, not actual daily price data. The maximum drawdowns and recovery periods are approximate, and the intermediate fluctuations differ from real price action."

### 3-4. 섹션 3 — 올인 경고

제목 + 본문.

한국어 제목: "그래서, 역사적 폭락에 올인(All-in)하는 것이 옳은가?"
한국어 본문:
"TQQQ는 2010년에 출시됐다. 즉 우리가 보고 있는 모든 데이터는 미국 증시 역사상 가장 길고 강했던 우상향기에 속한다. 위의 역사적 폭락들이 매번 회복된 것도 이 시기 안에서의 이야기다.
그 이전에 TQQQ가 있었다면 어땠을까. 나스닥 지수는 2000년 닷컴 버블 붕괴 때 고점 대비 약 -78%, 2008년 금융위기 때 약 -54% 하락했다. 3배 레버리지 상품은 이런 길고 깊은 하락장에서 단순히 지수의 3배로 떨어지는 데 그치지 않는다. 매일 손실이 복리로 누적되고, 하락과 반등을 오갈 때마다 가치가 깎여나가, 닷컴 버블처럼 2년 넘게 이어진 하락장이었다면 자산은 회복이 거의 불가능한 수준까지 사라졌을 것이다. -60%나 -80%에서 분할매수에 들어갔더라도 결과는 다르지 않았을 것이다.
이 페이지가 보여주는 '고점 대비 하락률'은 현재 위치를 알려주는 지표일 뿐, 바닥을 알려주는 지표가 아니다. 역사적 평균인 -60%가 이번 하락장의 바닥임을 보장해주지는 않는다."

English 제목: "Is it right to go all-in on a historic crash?"
English 본문:
"TQQQ launched in 2010. Every piece of data we are looking at belongs to one of the longest and strongest bull runs in U.S. market history. The fact that the historic crashes above all recovered is a story told entirely within that period.
What if TQQQ had existed before then? The Nasdaq fell roughly 78% from its peak during the 2000 dot-com collapse, and roughly 54% during the 2008 financial crisis. A 3x leveraged product does not simply fall three times as far in long, deep downturns like these. Losses compound daily, and value is eroded with every swing between decline and rebound — so in a downturn that dragged on for more than two years, like the dot-com crash, the asset would have been wiped out to a point of near-irrecoverability. Entering with staged buys at -60% or even -80% would not have changed that outcome.
The 'drawdown from peak' shown on this page tells you where the price is now — not where the bottom is. A historic average of -60% is no guarantee that it marks the bottom of the current downturn."

> 섹션 3의 -78%/-54%는 시장 지수 기록. 출시 전 직접 교차 확인 권장.

### 3-5. 푸터

- 면책 문구 필수: "투자 자문이 아니며, 데이터는 운영자가 입력한 종가 기준이고, 정확성을 보장하지 않습니다."

## 4. 사이드 광고 칸 (의도된 추가)

- 데스크톱 왼쪽 사이드에 제품 광고 칸(sticky). 모바일은 히어로 아래 가로 배너.
- 구성: 작은 라벨("제작자가 만든 제품") + 제품 이미지 + 제품명 + 짧은 설명 + "보러 가기" 버튼.
- 제품명: "히알루론산 피부영양제" (정식 명칭 최종 확인 필요)
- 설명: "약사이자 이 사이트 제작자가 직접 만들었습니다"
- 링크: https://smartstore.naver.com/checkmedi17/products/13431368745 (새 탭)
- 광고 칸 내용(이미지·제품명·설명·링크)은 한 곳(상수/설정 객체)에 모아 교체가 쉽게.
- 건강기능식품 광고 규정상 효능 단정 표현은 칸에 넣지 않는다. 담백한 소개만.

## 5. 색상 / 상태 표현

드로다운 깊이에 따라 메인 숫자 색이 바뀐다. 임계값은 상수로 분리.

| ATH 드로다운 구간 | 색상 톤       |
| ----------------- | ------------- |
| 0% ~ −10%         | 평온 (중립색) |
| −10% ~ −30%       | 주의 (주황)   |
| −30% 이하         | 경고 (빨강)   |

## 6. 예외 상황 처리

- **데이터 노후화:** 마지막 종가 입력 후 일정 일수(예: 3일) 경과 시 "데이터가 오래되었습니다" 자동 표시.
- **입력 이력 없음(최초 상태):** 종가·시드값이 없으면 깨진 숫자 대신 "데이터 준비 중" 안내.
- **저장소 연결 실패:** 면책 + "일시적 표시 오류" 안내. 페이지 크래시 금지.
- **숫자 표시:** 모든 화면 표출 숫자는 일관된 자릿수로 반올림(드로다운 1자리, 가격 2자리). 부동소수점 잔여값 노출 금지.

## 7. 1차 출시 범위 (MVP)

1. **1단계:** 히어로 영역(믹스1) + 비공개 관리자 입력 페이지 + 세 소개 섹션 + 사이드 광고 + 면책. → 출시 가능.
   - (참고: 역사적 폭락 차트는 본래 후속 단계였으나 소개 섹션과 함께 1단계에 포함하기로 변경.)
2. **후속:** 드로다운 차트(가격 흐름 기반), 추가 기능은 트래픽·수요 보고 결정.

## 8. 기술 가이드

- Next.js + Vercel. 서버리스/서버 액션으로 입력 처리. 무거운 백엔드 불필요.
- 반응형 필수. 모바일에서도 큰 숫자가 화면을 채우게.
- 크기·여백 관련 값(사이드 폭, 간격, 색상 임계값, 신선도 임계값 등)은 상수로 분리해 조정이 쉽게.

## 9. 하지 말 것

- 매수/매도 신호, "지금이 기회" 류 권유 문구.
- 회원가입·로그인 UI·알림 기능. (관리자 접근 보호는 단순 토큰만.)
- TQQQ 외 종목 추가 (단일 목적 유지).
- 1단계에서 외부 시세 API 연동. (provider 추상화로 자리만 만들어 둠.)
- split 미보정 데이터 사용 (향후 API 전환 시).
- API 키·관리자 인증값 프론트엔드 노출.

## 10. 향후 확장 (1차 범위 외)

- 트래픽 증가 시: 유료 시세 API provider(예: Polygon Stocks Starter, 미국 전 종목 포함) 추가 → 환경변수 교체로 자동 시세 전환. split-adjusted 데이터 사용.
- 드로다운 차트, 그 외 기능은 수요를 보고 결정.

---

## 변경 이력

**v2 → v3**

- 메인 페이지 디자인 통합: 3단 레이아웃, "믹스1" 히어로(TQQQ 배지 + 라벨 + 큰 숫자), 반응형 사이드 폭/간격.
- 세 개 소개 섹션 추가: 서비스 소개 / 역사적 폭락 사건별 차트 / 올인 경고. 각 한·영 문안 확정.
- 사이드 제품 광고 칸 추가(의도된 추가). 광고 내용·링크 명시.
- 입력값 검증(±30% 이상치 경고), 분할 일괄 보정 기능, 로컬 개발용 파일 fallback 반영.
- 1차 출시 범위에 소개 섹션·역사적 폭락 차트 포함하도록 조정.

**v1 → v2**

- 데이터 방식을 "외부 시세 API(15분 지연)"에서 "운영자 수동 종가 입력"으로 변경. 사유: 무료 시세 API는 공개 웹 표출/재배포를 약관에서 금지하며, 약관이 깨끗한 옵션은 유료 구독뿐. 비용 없이 출시하기 위해 수동 입력 채택.
- 비공개 관리자 페이지 추가. 갱신 기준 "15분 지연" → "입력된 종가 기준".
- ATH/1년 고점 초기 시드값 수동 입력 절차 추가.
