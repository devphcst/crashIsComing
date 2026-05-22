import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsWrapper } from "@/components/AnalyticsWrapper";
import { SEO_TEXT, SITE_URL } from "@/constants/seo";

const ko = SEO_TEXT.ko;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: ko.title,
    template: "%s | TQQQ",
  },
  description: ko.description,
  keywords: ko.keywords,
  applicationName: "TQQQ Drawdown Monitor",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: "_5jFsOlN8J3ZlU3HFS0BtZ0y3Oa8e2hDNtFT6aCb-dA",
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
        <AnalyticsWrapper />
      </body>
    </html>
  );
}
