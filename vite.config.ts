import { defineConfig } from "vitest/config";
export default defineConfig({
  base: "/badminton-h5-online/",
  build: { outDir: "dist/client" },
  server: {
    port: 5184,
    strictPort: true,
    proxy: {
      "/badminton-h5-online/api": "http://127.0.0.1:8794",
      "/badminton-h5-online/ws": { target: "ws://127.0.0.1:8794", ws: true },
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
