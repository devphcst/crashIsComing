import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsWrapper } from "@/components/AnalyticsWrapper";
import { PwaGuide } from "@/components/PwaGuide";
import { SEO_TEXT, SITE_URL } from "@/constants/seo";

const ko = SEO_TEXT.ko;
const DEFAULT_DISPLAY_NAME = "TQQQ";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: ko.titleFor(DEFAULT_DISPLAY_NAME),
    template: "%s | TQQQ",
  },
  description: ko.descriptionFor(DEFAULT_DISPLAY_NAME),
  keywords: ko.keywords,
  applicationName: "TQQQ Drawdown Monitor",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: "ZP18RhVMow51FTNE8R9_mOCZ8Gc3_CTYqUAXjCqyxU4",
    other: {
      "naver-site-verification": "80065ee72c07be122150434f535e3da96f016ff3",
    },
  },
  alternates: {
    canonical: "/",
    languages: {
      ko: "/",
      en: "/",
    },
  },
  // PWA: iOS 홈 화면 앱 표기 + 정적 아이콘 세트. Android/Chrome은 manifest.ts만으로 충분.
  appleWebApp: {
    capable: true,
    title: "폭락은 온다",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// viewport-fit=cover: iOS 노치/홈 인디케이터 영역까지 배경 확장 → safe-area-inset로 컨텐츠 보호.
export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-mono antialiased">
        {children}
        <PwaGuide />
        <AnalyticsWrapper />
      </body>
    </html>
  );
}
