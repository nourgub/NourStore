import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.tsx",
      "client/**/*.test.ts",
      "shared/**/*.test.ts",
    ],
    // Frontend component tests need a real DOM (jsdom); server tests run
    // fine in plain Node — this lets both coexist without slowing down the
    // much more numerous server tests with an unnecessary DOM.
    environmentMatchGlobs: [
      ["client/**/*.test.tsx", "jsdom"],
      ["client/**/*.test.ts", "jsdom"],
    ],
    setupFiles: ["./client/src/test-setup.ts"],
  },
});
