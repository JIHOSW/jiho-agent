import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jihodev · 고객 온보딩 에이전트",
  description: "LLM이 목표를 이해하고 도구를 골라 실행하며, 사람 승인을 거쳐 고객을 첫 활용까지 이끄는 온보딩 에이전트",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
