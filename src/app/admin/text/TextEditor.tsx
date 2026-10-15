"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Lang } from "@/lib/i18n";
import {
  AXES,
  AXIS_ORDER,
  ALL_CODES,
  INVESTOR_TYPES,
  type TypeCode,
  type AxisKey,
} from "@/data/investor-types";
import { QUESTIONS } from "@/data/investor-quiz";
import {
  limitForKey,
  type FlatTexts,
} from "@/lib/text-defaults";
import type { TextOverrides } from "@/lib/text-defaults";
import {
  resetAllTextOverridesAction,
  saveTextOverridesAction,
} from "../text-actions";

type Group = "entry" | "exp" | "beg" | "type";

const GROUP_LABELS: Record<Group, string> = {
  entry: "진입·공통",
  exp: "경험 트랙",
  beg: "처음 트랙",
  type: "유형",
};

export function TextEditor({
  defaults,
  initialOverrides,
}: {
  defaults: Record<Lang, FlatTexts>;
  initialOverrides: TextOverrides;
}) {
  const [lang, setLang] = useState<Lang>("ko");
  const [group, setGroup] = useState<Group>("entry");
  // 각 lang별 "현재 입력 중인" 로컬 상태. 서버에 저장되지 않은 변경 포함.
  const [draft, setDraft] = useState<Record<Lang, FlatTexts>>({
    ko: { ...(initialOverrides.ko ?? {}) },
    en: { ...(initialOverrides.en ?? {}) },
  });
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // 서버 반영된 값 (저장 성공 시 draft와 동기화). 미저장 변경 체크용.
  const [saved, setSaved] = useState<Record<Lang, FlatTexts>>({
    ko: { ...(initialOverrides.ko ?? {}) },
    en: { ...(initialOverrides.en ?? {}) },
  });

  const draftLang = draft[lang];
  const defaultsLang = defaults[lang];
  const savedLang = saved[lang];

  // 현 그룹에서 draft와 saved가 "실제 KV에 들어갈 값" 기준으로 다른 키 수.
  // defaults와 똑같이 입력하거나 비우면 override에서 제거되므로 undefined 취급.
  const unsavedKeys = useMemo(() => {
    const keys = Object.keys(defaultsLang).filter(
      (k) => keyGroup(k) === group,
    );
    const effective = (raw: string | undefined, def: string) => {
      if (raw === undefined) return undefined;
      const t = raw.trim();
      if (!t || t === def) return undefined;
      return t;
    };
    return keys.filter(
      (k) =>
        effective(draftLang[k], defaultsLang[k]) !==
        effective(savedLang[k], defaultsLang[k]),
    );
  }, [defaultsLang, draftLang, savedLang, group]);

  const hasUnsaved = unsavedKeys.length > 0;

  // beforeunload 경고
  useEffect(() => {
    if (!hasUnsaved) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [hasUnsaved]);

  const switchGroup = (next: Group) => {
    if (hasUnsaved) {
      const ok = window.confirm(
        "저장하지 않은 변경이 있어요. 그래도 이동할까요? 변경 내용은 유지됩니다.",
      );
      if (!ok) return;
    }
    setGroup(next);
  };

  const switchLang = (next: Lang) => {
    // 다른 lang으로 전환해도 그 lang의 입력은 유지 (draft[lang] 별도).
    setLang(next);
  };

  const setValue = (key: string, value: string) => {
    setDraft((d) => ({
      ...d,
      [lang]: { ...d[lang], [key]: value },
    }));
  };

  const resetKey = (key: string) => {
    setDraft((d) => {
      const copy = { ...d[lang] };
      delete copy[key];
      return { ...d, [lang]: copy };
    });
  };

  const saveGroup = () => {
    // 이 그룹에 속하는 모든 default 키에 대해, draft 값(없으면 "")을 전송.
    // 서버가 비어있거나 default와 동일하면 override에서 제거.
    const updates: Record<string, string> = {};
    for (const k of Object.keys(defaultsLang)) {
      if (keyGroup(k) !== group) continue;
      updates[k] = draftLang[k] ?? "";
    }
    startTransition(async () => {
      const res = await saveTextOverridesAction(lang, updates);
      setToast({ ok: res.ok, msg: res.message ?? "" });
      if (res.ok) {
        // 서버가 적용한 결과를 반영 (defaults와 동일했던 값은 제거되었을 수 있음)
        setSaved((s) => {
          const next: FlatTexts = {};
          for (const [k, v] of Object.entries(draftLang)) {
            if (keyGroup(k) !== group) {
              next[k] = v;
              continue;
            }
            const trimmed = v.trim();
            if (trimmed && trimmed !== defaultsLang[k]) {
              next[k] = trimmed;
            }
          }
          // 다른 그룹의 saved 값 유지
          for (const [k, v] of Object.entries(s[lang] ?? {})) {
            if (keyGroup(k) !== group) next[k] = v;
          }
          return { ...s, [lang]: next };
        });
        // draft도 서버 상태와 동기화 (trim)
        setDraft((d) => {
          const next: FlatTexts = {};
          for (const [k, v] of Object.entries(d[lang] ?? {})) {
            next[k] = v;
          }
          for (const k of Object.keys(defaultsLang)) {
            if (keyGroup(k) !== group) continue;
            const v = (next[k] ?? "").trim();
            if (!v || v === defaultsLang[k]) {
              delete next[k];
            } else {
              next[k] = v;
            }
          }
          return { ...d, [lang]: next };
        });
      }
    });
  };

  const resetAll = () => {
    if (
      !window.confirm(
        "모든 언어·모든 키의 오버라이드를 초기화할까요? 되돌릴 수 없어요.",
      )
    )
      return;
    startTransition(async () => {
      const res = await resetAllTextOverridesAction();
      setToast({ ok: res.ok, msg: res.message ?? "" });
      if (res.ok) {
        setDraft({ ko: {}, en: {} });
        setSaved({ ko: {}, en: {} });
      }
    });
  };

  // 토스트 자동 해제
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const commonProps = {
    lang,
    defaults: defaultsLang,
    draft: draftLang,
    setValue,
    resetKey,
  };

  return (
    <div className="space-y-5">
      {/* 언어 탭 */}
      <div className="flex gap-2">
        {(["ko", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => switchLang(l)}
            className={
              "rounded-full px-3 py-1 text-sm " +
              (l === lang
                ? "bg-fg text-bg"
                : "border border-line text-muted hover:text-fg")
            }
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* 그룹 탭 */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(GROUP_LABELS) as Group[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => switchGroup(g)}
            className={
              "rounded-md px-3 py-1 text-sm " +
              (g === group
                ? "bg-fg text-bg"
                : "border border-line text-muted hover:text-fg")
            }
          >
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {/* 그룹 콘텐츠 */}
      <section className="space-y-4 rounded-lg border border-line p-5">
        {group === "entry" ? <EntryGroup {...commonProps} /> : null}
        {group === "exp" ? <QuestionGroup track="exp" {...commonProps} /> : null}
        {group === "beg" ? <QuestionGroup track="beg" {...commonProps} /> : null}
        {group === "type" ? <TypeGroup {...commonProps} /> : null}
      </section>

      {/* 저장 바 */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-bg px-1 py-3">
        <div className="text-xs text-muted">
          {hasUnsaved ? (
            <span className="text-fg">저장 안 된 변경 {unsavedKeys.length}개</span>
          ) : (
            <span>변경 없음</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            disabled={pending}
            className="rounded-md border border-line px-3 py-2 text-xs text-muted hover:text-fg disabled:opacity-50"
          >
            전체 초기화
          </button>
          <button
            type="button"
            onClick={saveGroup}
            disabled={pending || !hasUnsaved}
            className="rounded-md bg-fg px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
          >
            {pending ? "저장 중..." : `${GROUP_LABELS[group]} 저장`}
          </button>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className={
            "fixed left-1/2 bottom-16 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm " +
            (toast.ok ? "bg-fg text-bg" : "bg-down text-bg")
          }
          style={toast.ok ? undefined : { background: "#F04452", color: "#fff" }}
        >
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}

const keyGroup = (key: string): Group => {
  if (key.startsWith("exp.")) return "exp";
  if (key.startsWith("beg.")) return "beg";
  if (key.startsWith("type.")) return "type";
  return "entry";
};

/* ============================================================================
 * 공통 입력 컴포넌트
 * ============================================================================ */

type FieldProps = {
  k: string;
  defaults: FlatTexts;
  draft: FlatTexts;
  setValue: (k: string, v: string) => void;
  resetKey: (k: string) => void;
  multiline?: boolean;
  label?: string;
  badge?: React.ReactNode;
};

function Field({
  k,
  defaults,
  draft,
  setValue,
  resetKey,
  multiline = false,
  label,
  badge,
}: FieldProps) {
  const def = defaults[k] ?? "";
  const cur = draft[k];
  // 입력창에는 항상 "현재 저장될 값"을 표시 — override 있으면 그 값, 없으면 기본값.
  // 사용자는 그 위에서 일부만 수정할 수 있다. 전체를 지우면 빈 input이 되고,
  // 저장 시 서버가 defaults로 되돌림. "기본값으로" 버튼으로도 복원 가능.
  const value = cur !== undefined ? cur : def;
  const touched = cur !== undefined;
  const modified = touched && cur.trim() !== "" && cur.trim() !== def;
  const limit = limitForKey(k);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {modified ? (
            <span
              aria-label="수정됨"
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#6D5BD0",
              }}
            />
          ) : null}
          <label
            htmlFor={`fld-${k}`}
            className="text-xs text-muted"
            title={k}
          >
            {label ?? k}
          </label>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              "text-[10px] " +
              (value.length > limit ? "text-down" : "text-muted")
            }
          >
            {value.length}/{limit}
          </span>
          {touched ? (
            <button
              type="button"
              onClick={() => resetKey(k)}
              className="text-[10px] text-muted hover:text-fg"
            >
              기본값으로
            </button>
          ) : null}
        </div>
      </div>
      {multiline ? (
        <textarea
          id={`fld-${k}`}
          value={value}
          maxLength={limit}
          onChange={(e) => setValue(k, e.target.value)}
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
          rows={3}
        />
      ) : (
        <input
          id={`fld-${k}`}
          type="text"
          value={value}
          maxLength={limit}
          onChange={(e) => setValue(k, e.target.value)}
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}

/* ============================================================================
 * 진입·공통
 * ============================================================================ */

const ENTRY_KEYS: Array<{
  k: string;
  label: string;
  multiline?: boolean;
}> = [
  { k: "entry.headerPill", label: "헤더 pill" },
  { k: "entry.banner.title", label: "띠 배너 제목" },
  { k: "entry.banner.sub", label: "띠 배너 부제" },
  { k: "entry.menuItem", label: "모바일 메뉴 항목" },
  { k: "loading.done", label: "로딩 상단 작은 문구 (완료 표시)" },
  { k: "loading.title", label: "로딩 큰 제목" },
  { k: "loading.status.buy", label: "로딩 상태 1 (판단)" },
  { k: "loading.status.lev", label: "로딩 상태 2 (위험)" },
  { k: "loading.status.hold", label: "로딩 상태 3 (기간)" },
  { k: "loading.status.mind", label: "로딩 상태 4 (멘탈)" },
  { k: "loading.found", label: "로딩 완료 문구" },
  { k: "loading.axesHint", label: "로딩 보조 문구 (축 안내)" },
  { k: "intro.line1", label: "시작 화면 안내 1 (분량)" },
  { k: "intro.line2", label: "시작 화면 안내 2 (16유형)" },
  { k: "intro.line3", label: "시작 화면 안내 3 (저장 안 함)" },
  { k: "intro.question", label: "0번 갈림길 질문" },
  { k: "intro.option.experienced", label: "0번 선택 1 (경험)" },
  { k: "intro.option.beginner", label: "0번 선택 2 (처음)" },
  { k: "result.title", label: "결과 상단 라벨" },
  { k: "result.quotesLabel", label: "자주 하는 말 라벨" },
  { k: "result.match", label: "잘 맞는 유형 라벨" },
  { k: "result.opposite", label: "상극 유형 라벨" },
  { k: "result.resultCta", label: "공유 버튼" },
  { k: "result.retry", label: "다시 하기 버튼" },
  { k: "result.tryTest", label: "나도 해보기 (공유 페이지)" },
  { k: "result.inCrashLabel", label: "폭락장이 오면 라벨 ({reading})" },
  { k: "result.nasdaqLine", label: "나스닥 라인 ({pct})" },
  { k: "result.atHighLine", label: "신고가 메시지", multiline: true },
  { k: "result.goCheck", label: "보러 가기" },
  {
    k: "result.beginnerDisclaimer",
    label: "처음 트랙 결과 안내",
    multiline: true,
  },
  { k: "result.disclaimer", label: "면책 문구", multiline: true },
  { k: "result.sharedToast", label: "링크 복사 토스트" },
  { k: "result.surprisesLabel", label: "의외의 모습 라벨" },
  {
    k: "result.surprisesConsistent",
    label: "의외의 모습 — 모든 답 한 방향일 때 ({reading})",
    multiline: true,
  },
  { k: "axes.buy.q", label: "4축 카드 — 판단 질문" },
  { k: "axes.buy.pos", label: "4축 카드 — 판단 답 (B)" },
  { k: "axes.buy.neg", label: "4축 카드 — 판단 답 (M)" },
  { k: "axes.lev.q", label: "4축 카드 — 위험 질문" },
  { k: "axes.lev.pos", label: "4축 카드 — 위험 답 (E)" },
  { k: "axes.lev.neg", label: "4축 카드 — 위험 답 (O)" },
  { k: "axes.hold.q", label: "4축 카드 — 기간 질문" },
  { k: "axes.hold.pos", label: "4축 카드 — 기간 답 (H)" },
  { k: "axes.hold.neg", label: "4축 카드 — 기간 답 (T)" },
  { k: "axes.mind.q", label: "4축 카드 — 멘탈 질문" },
  { k: "axes.mind.pos", label: "4축 카드 — 멘탈 답 (I)" },
  { k: "axes.mind.neg", label: "4축 카드 — 멘탈 답 (A)" },
  { k: "axes.even", label: "4축 카드 — 동점 표시" },
];

function EntryGroup(props: {
  lang: Lang;
  defaults: FlatTexts;
  draft: FlatTexts;
  setValue: (k: string, v: string) => void;
  resetKey: (k: string) => void;
}) {
  return (
    <div className="space-y-4">
      {ENTRY_KEYS.map(({ k, label, multiline }) => (
        <Field
          key={k}
          k={k}
          label={label}
          multiline={multiline}
          defaults={props.defaults}
          draft={props.draft}
          setValue={props.setValue}
          resetKey={props.resetKey}
        />
      ))}
    </div>
  );
}

/* ============================================================================
 * 문항 (경험/처음 트랙)
 * ============================================================================ */

const axisMetaFor = (axis: AxisKey) =>
  AXES.find((a) => a.key === axis)!;

const AXIS_LABEL: Record<AxisKey, string> = {
  buy: "판단",
  lev: "위험",
  hold: "기간",
  mind: "멘탈",
};

function QuestionGroup({
  track,
  lang,
  defaults,
  draft,
  setValue,
  resetKey,
}: {
  track: "exp" | "beg";
  lang: Lang;
  defaults: FlatTexts;
  draft: FlatTexts;
  setValue: (k: string, v: string) => void;
  resetKey: (k: string) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const list = QUESTIONS[track === "exp" ? "experienced" : "beginner"];

  return (
    <div className="space-y-2">
      {list.map((q, i) => {
        const idx = i + 1;
        const textKey = `${track}.q${idx}.text`;
        const promptCurrent = draft[textKey]?.trim() || defaults[textKey];
        const meta = axisMetaFor(q.axis);
        const open = openIdx === i;

        return (
          <div key={q.id} className="rounded-md border border-line">
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xs text-muted shrink-0">{idx}.</span>
                <span className="truncate text-sm text-fg">{promptCurrent}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <span
                  style={{
                    color: meta.color,
                    fontWeight: 600,
                  }}
                >
                  {AXIS_LABEL[q.axis]}
                </span>
                <span className="text-muted">· +1 / 0 / -1</span>
                <span className="text-muted">{open ? "▲" : "▼"}</span>
              </div>
            </button>
            {open ? (
              <div className="space-y-3 border-t border-line px-4 py-3">
                <Field
                  k={textKey}
                  label="질문"
                  defaults={defaults}
                  draft={draft}
                  setValue={setValue}
                  resetKey={resetKey}
                />
                <Field
                  k={`${track}.q${idx}.label`}
                  label="문항 라벨 (의외의 모습 카드용)"
                  defaults={defaults}
                  draft={draft}
                  setValue={setValue}
                  resetKey={resetKey}
                />
                {q.choices.map((_, j) => (
                  <Field
                    key={j}
                    k={`${track}.q${idx}.opt${j}`}
                    label={`선택 ${j + 1} (${j === 0 ? "+1" : j === 1 ? "0" : "-1"})`}
                    defaults={defaults}
                    draft={draft}
                    setValue={setValue}
                    resetKey={resetKey}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * 유형 — 드롭다운 + 7필드 + 미리보기
 * ============================================================================ */

const TYPE_FIELDS: Array<{
  suffix: string;
  label: string;
  multiline?: boolean;
}> = [
  { suffix: "nickname", label: "별명" },
  { suffix: "description", label: "설명", multiline: true },
  { suffix: "strength", label: "강점", multiline: true },
  { suffix: "caution", label: "조심할 점", multiline: true },
  { suffix: "quotes.0", label: "자주 하는 말 1" },
  { suffix: "quotes.1", label: "자주 하는 말 2" },
  { suffix: "inCrash", label: "폭락장이 오면", multiline: true },
];

function TypeGroup({
  lang,
  defaults,
  draft,
  setValue,
  resetKey,
}: {
  lang: Lang;
  defaults: FlatTexts;
  draft: FlatTexts;
  setValue: (k: string, v: string) => void;
  resetKey: (k: string) => void;
}) {
  const [code, setCode] = useState<TypeCode>(ALL_CODES[0]);
  const type = INVESTOR_TYPES[code];

  const resolve = (suffix: string): string => {
    const k = `type.${code}.${suffix}`;
    const d = draft[k]?.trim();
    return d && d !== defaults[k] ? d : defaults[k] ?? "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted">유형</label>
        <select
          value={code}
          onChange={(e) => setCode(e.target.value as TypeCode)}
          className="rounded-md border border-line bg-bg px-2 py-1 text-sm"
        >
          {ALL_CODES.map((c) => (
            <option key={c} value={c}>
              {c} · {INVESTOR_TYPES[c].reading[lang]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          {TYPE_FIELDS.map(({ suffix, label, multiline }) => (
            <Field
              key={suffix}
              k={`type.${code}.${suffix}`}
              label={label}
              multiline={multiline}
              defaults={defaults}
              draft={draft}
              setValue={setValue}
              resetKey={resetKey}
            />
          ))}
        </div>

        {/* 미리보기 */}
        <div className="space-y-3">
          <div className="text-xs text-muted">미리보기</div>
          <div className="rounded-lg border border-line p-4 space-y-3">
            <div className="text-center">
              <div
                style={{
                  fontSize: 36,
                  letterSpacing: 3,
                  fontWeight: 500,
                }}
              >
                {code}
              </div>
              <div className="mt-1 text-sm">
                {type.reading[lang]} · {resolve("nickname")}
              </div>
              <p className="mt-2 text-xs text-muted">{resolve("description")}</p>
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span style={{ color: "#1E9E6A", fontWeight: 600 }}>강점</span>{" "}
                {resolve("strength")}
              </div>
              <div>
                <span style={{ color: "#F59E0B", fontWeight: 600 }}>조심</span>{" "}
                {resolve("caution")}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div
                style={{
                  background: "#F2F4F8",
                  padding: "8px 10px",
                  borderRadius: "12px 12px 12px 2px",
                  fontSize: 12,
                  alignSelf: "flex-start",
                  maxWidth: "95%",
                }}
              >
                &ldquo;{resolve("quotes.0")}&rdquo;
              </div>
              <div
                style={{
                  background: "#F2F4F8",
                  padding: "8px 10px",
                  borderRadius: "12px 12px 12px 2px",
                  fontSize: 12,
                  alignSelf: "flex-start",
                  maxWidth: "95%",
                }}
              >
                &ldquo;{resolve("quotes.1")}&rdquo;
              </div>
            </div>
            <div
              style={{
                background: "#FDEEEF",
                padding: "10px 12px",
                borderRadius: 12,
                fontSize: 12,
                color: "#191F28",
              }}
            >
              <div style={{ fontSize: 10, color: "#8A5A5E", marginBottom: 4 }}>
                {type.reading[lang]}에게 폭락장이 오면
              </div>
              {resolve("inCrash")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 축 메타의 ko 뱃지에 lang 변수를 안 쓰므로 unused warn 방지. */
void AXIS_ORDER;
