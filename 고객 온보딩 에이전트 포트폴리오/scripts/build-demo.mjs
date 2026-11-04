// 녹화본만 재생하는 정적 시연판을 demo-dist/ 에 빌드합니다. (GitHub Pages 게시용)
// 정적 내보내기는 서버 API를 포함할 수 없어서, 빌드하는 동안만 src/app/api 를 잠시 옮겨 둡니다.
// 사용: node scripts/build-demo.mjs [basePath] [liveUrl]
import { execSync } from "node:child_process";
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";

const basePath = process.argv[2] ?? "/jiho-agent/onboarding-agent";
const liveUrl = process.argv[3] ?? process.env.NEXT_PUBLIC_LIVE_URL ?? "";
const api = "src/app/api";
const parked = ".api-parked";

if (existsSync(parked)) throw new Error(`${parked} 폴더가 남아 있습니다. src/app/api 로 되돌린 뒤 다시 실행하세요.`);
renameSync(api, parked);
try {
  rmSync(".next", { recursive: true, force: true });
  execSync("npx next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      STATIC_DEMO: "1",
      NEXT_PUBLIC_DEMO_ONLY: "1",
      NEXT_PUBLIC_BASE_PATH: basePath,
      NEXT_PUBLIC_LIVE_URL: liveUrl,
    },
  });
} finally {
  renameSync(parked, api);
}
rmSync("demo-dist", { recursive: true, force: true });
cpSync("out", "demo-dist", { recursive: true });
rmSync("out", { recursive: true, force: true });
console.log(`demo-dist/ 생성 완료 (basePath: ${basePath})`);
