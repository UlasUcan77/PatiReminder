import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests share one database, so run files one after another.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://pati:pati@localhost:5433/patireminder_test",
      // Not a real secret: tests only need a value long enough to pass config validation.
      JWT_SECRET: "test".padEnd(32, "-"),
    },
  },
});
