import path from "node:path";
import { defineConfig } from "vitest/config";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// Mirrors tsconfig's `"@/*": ["./*"]` path alias, which Vite doesn't read on its own.
const alias = { "@": path.resolve(import.meta.dirname) };

export default defineConfig({
  // The React Compiler, through the same Babel plugin Next runs for the app
  // (next.config.ts `reactCompiler: true`), so components are tested as they ship. Without it,
  // code the compiler mis-memoizes passes here and only fails in the real app.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: { alias },
  test: {
    // A project with no test files passes instead of failing the whole run.
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          // Pure functions and anything that reads or writes the real local Supabase. The DB
          // tests share one seeded tenant (registration-test-tenant), so files run one at a time
          // rather than racing each other's writes.
          name: "server",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: ["e2e/**", "node_modules/**"],
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          // Components, rendered into jsdom. Nothing in this project touches the database.
          name: "dom",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude: ["e2e/**", "node_modules/**"],
          setupFiles: ["./test/setup-dom.ts"],
        },
      },
    ],
  },
});
