import type { Metadata } from "next";
import "./globals.css";
import { AnalyticsWrapper } from "@/components/AnalyticsWrapper";

export const metadata: Metadata = {
  title: "TQQQ Drawdown Monitor",
  description:
    "TQQQ가 전고점에서 현재 몇 % 빠졌는지를 보여주는 단일 페이지 모니터.",
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
