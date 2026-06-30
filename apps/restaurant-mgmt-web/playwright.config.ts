import { defineConfig } from "@playwright/test";

// a11y (axe) gate for restaurant-mgmt-web. Runs against a production `next start`
// on :3001. The web gate already builds the app, so this reuses that output.
export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://localhost:3001" },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
