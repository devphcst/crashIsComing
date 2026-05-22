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
