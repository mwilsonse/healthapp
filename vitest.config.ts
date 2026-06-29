import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    exclude:
      process.env.RUN_INTEGRATION_TESTS === "1"
        ? []
        : ["src/tests/integration/**"],
    environment: "jsdom",
    globals: true,
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
