"use client";

import type { Lang, Dict } from "@/lib/i18n";
import type { SymbolMeta } from "@/lib/symbols";
import { LangToggle } from "./LangToggle";
import { MobileMenu } from "./MobileMenu";
import { MainSymbolTabs } from "./MainSymbolTabs";
import { TypeTestPill } from "./type/TypeTestPill";
import { TypeTestBanner } from "./type/TypeTestBanner";

/**
 * 요약(/[ticker])과 서브 페이지가 공유하는 헤더.
 *   - 브랜드 텍스트 (좌)
 *   - LangToggle (데스크톱, 우)
 *   - MobileMenu 햄버거 (모바일, 우)
 *   - MainSymbolTabs (종목 2개 이상일 때만)
 *
 * lang state는 부모(client component)가 소유. `anchorBase`가 세팅되면 MobileMenu 항목은
 * "{anchorBase}#about" 처럼 다른 페이지로의 링크가 된다 (서브 페이지 → 요약 페이지 이동용).
 */
export function SiteHeader({
  lang,
  onChangeLang,
  dict,
  tabs,
  current,
  anchorBase,
  showTypeBanner = false,
}: {
  lang: Lang;
  onChangeLang: (l: Lang) => void;
  dict: Dict;
  tabs: SymbolMeta[];
  current: string;
  /** MobileMenu 앵커 링크 접두어. 서브 페이지에서 요약 페이지 앵커로 이동시킬 때 사용. */
  anchorBase?: string;
  /** 서버에서 type_banner_dismissed 쿠키 체크 후 전달. 헤더 아래 띠 배너 노출. */
  showTypeBanner?: boolean;
}) {
  return (
    <>
      <div className="sticky top-0 z-30 bg-bg/90 backdrop-blur lg:relative lg:bg-transparent lg:backdrop-blur-none">
        <header className="flex items-center justify-between gap-2 px-6 pb-3 pt-6 lg:pb-0">
          <span className="text-sm text-muted">{dict.brand}</span>
          <div className="flex items-center gap-2">
            <TypeTestPill lang={lang} />
            <div className="hidden lg:block">
              <LangToggle
                lang={lang}
                onChange={onChangeLang}
                ariaLabel={dict.langToggleAria}
              />
            </div>
            <MobileMenu
              lang={lang}
              onChangeLang={onChangeLang}
              dict={dict}
              anchorBase={anchorBase}
            />
          </div>
        </header>
        {showTypeBanner ? (
          <div className="px-6 pb-3">
            <TypeTestBanner lang={lang} />
          </div>
        ) : null}
      </div>

      {tabs.length > 1 ? (
        <MainSymbolTabs tabs={tabs} current={current} />
      ) : null}
    </>
  );
}
