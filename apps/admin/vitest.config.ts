import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Mirrors tsconfig's `"@/*": ["./*"]` path alias, which Vite doesn't read on its own.
const alias = { "@": path.resolve(import.meta.dirname) };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          // Schemas and server actions. Server action tests hit the real local Supabase, and
          // several of them write to the same seeded tenant (admin-test-tenant), so files run
          // one at a time rather than racing each other's writes.
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
          // Client components, rendered into jsdom. Server actions are mocked per test file,
          // so nothing in this project touches the database.
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
