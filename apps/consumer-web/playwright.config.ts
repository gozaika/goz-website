import { defineConfig } from "@playwright/test";

// a11y (axe) gate for consumer-web. Runs against a production `next start` on
// :3000. The web gate already builds the app, so this reuses that output.
export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
