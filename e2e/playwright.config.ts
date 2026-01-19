import { defineConfig } from "@playwright/test";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// テスト用のログファイル（ユーザーのログを汚染しない）
const TEST_LOG_FILE = resolve(__dirname, ".tmp/events.ndjson");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 同一ファイルへの書き込み競合を避けるため
  reporter: "list",
  use: {
    baseURL: "http://localhost:8182",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: `cd ../server && PORT=8182 LOG_FILE=${TEST_LOG_FILE} deno task start`,
    url: "http://localhost:8182",
    reuseExistingServer: false,
    timeout: 10000,
  },
});
