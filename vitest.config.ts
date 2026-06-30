import { configDefaults, defineConfig } from "vitest/config";

// Repo-wide vitest defaults. Unit/contract tests use `*.test.ts`; Playwright
// e2e/a11y specs use `*.spec.ts` and live under each app's `tests/` dir — keep
// those out of vitest so the two runners don't collide (the web gate runs the
// Playwright specs separately via `npm run a11y`).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/*.spec.ts", "**/tests/**"],
  },
});
