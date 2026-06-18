/**
 * Discord webhook 알림 모듈.
 *
 * 외부 알림 채널은 Discord 한 곳으로 단순화 — webhook URL 한 줄 설정만으로 폰 푸시 가능.
 * DISCORD_WEBHOOK_URL 미설정 시 silent fallback (console.warn).
 *
 * 디둡 정책
 *   - 실패 알림: 연속 2회 실패부터, 24h 1통 한도 (IngestStatus.lastNotifyAt)
 *   - 복구 알림: 직전이 알림 발송된 실패 상태였을 때만 1통 (IngestStatus.pendingRecovery)
 *   - watchdog 알림: 시스템 전역 24h 1통 (kv의 system:watchdog:lastNotifyAt)
 *   - 시스템 환경 알림: 디둡 없음 (env 미설정은 즉시 대응 필요한 운영 이슈)
 */

const HOUR_MS = 3_600_000;
const DEDUP_HOURS = 24;

const isWithinDedup = (lastTs: string | undefined | null): boolean => {
  if (!lastTs) return false;
  const last = Date.parse(lastTs);
  if (Number.isNaN(last)) return false;
  return Date.now() - last < DEDUP_HOURS * HOUR_MS;
};

/**
 * Discord 메시지 발송. webhook 미설정 시 console.warn 후 false 반환.
 * 발송 자체 실패는 캐치만 하고 throw 안 함 — cron 본 동작에 영향 주지 않음.
 */
const sendToDiscord = async (content: string): Promise<boolean> => {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.warn(
      "[notify] DISCORD_WEBHOOK_URL missing — alert silenced:",
      content.slice(0, 200),
    );
    return false;
  }
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      console.error("[notify] discord http", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] discord send failed:", err);
    return false;
  }
};

/**
 * 종가 수집 실패 알림. 호출 측에서 디둡 판단 후 호출.
 * 반환값: 실제 발송됐는지 (true → IngestStatus.lastNotifyAt 갱신용).
 */
export const notifyIngestFailure = async (
  ticker: string,
  consecutiveFailures: number,
  errorMessage: string,
): Promise<boolean> => {
  const content =
    `⚠️ **종가 수집 실패** — \`${ticker.toUpperCase()}\`\n` +
    `연속 ${consecutiveFailures}회 실패\n` +
    `\`\`\`${errorMessage.slice(0, 500)}\`\`\``;
  return sendToDiscord(content);
};

export const notifyIngestRecovery = async (ticker: string): Promise<boolean> => {
  const content =
    `✅ **종가 수집 복구** — \`${ticker.toUpperCase()}\`\n` +
    `직전 실패 후 정상화됨.`;
  return sendToDiscord(content);
};

/**
 * 시스템 환경변수 미설정 알림. 디둡 없이 즉시 발송.
 * TWELVE_DATA_API_KEY 같은 필수 키가 빠진 경우 cron이 자체 작동 불가능 — 즉각 대응 필요.
 */
export const notifySystemAlert = async (message: string): Promise<boolean> => {
  const content = `🚨 **시스템 알람**\n${message}`;
  return sendToDiscord(content);
};

/**
 * Dead man's switch — 메인 cron이 아예 실행 안 됐을 가능성 알림.
 * missingTickers는 lastSuccess.date가 expected와 다른 종목들.
 * watchdog 디둡(24h)은 호출 측에서 KV 키로 처리.
 */
export const notifyWatchdog = async (
  missingTickers: Array<{ ticker: string; lastDate: string | null }>,
  expectedTradingDate: string,
): Promise<boolean> => {
  const lines = missingTickers
    .map(
      (m) =>
        `- \`${m.ticker.toUpperCase()}\`: ${m.lastDate ? `마지막 성공 ${m.lastDate}` : "기록 없음"}`,
    )
    .join("\n");
  const content =
    `⚠️ **감시 알람 — ${missingTickers.length}개 종목 데이터 누락**\n` +
    `예상 거래일: ${expectedTradingDate}\n` +
    `${lines}\n\n` +
    `메인 cron(\`/api/cron/twelvedata\`) 자체 실행 실패 가능성. ` +
    `Vercel 대시보드 Crons 로그 + 환경변수 확인 권장.`;
  return sendToDiscord(content);
};

export { isWithinDedup, DEDUP_HOURS };
