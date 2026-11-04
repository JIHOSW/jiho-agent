import type { NextConfig } from "next";

// STATIC_DEMO=1 이면 서버 없이 녹화본만 재생하는 정적 시연판(GitHub Pages용)으로 빌드합니다.
const staticDemo = process.env.STATIC_DEMO === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = staticDemo
  ? { output: "export", basePath, trailingSlash: true, images: { unoptimized: true } }
  : {};

export default nextConfig;
