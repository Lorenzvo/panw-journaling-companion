import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    environment: "jsdom",
    environmentMatchGlobs: [["tests/insights.test.ts", "node"]],
    setupFiles: ["tests/setup.ts"],
  },
});
