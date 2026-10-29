import { z } from "zod";

// Fail fast on startup if the environment is incomplete, instead of failing
// on the first request that needs a missing value.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Turn off on extra instances if you only want one process sending reminders
  // (sending twice is already prevented, this just saves work).
  REMINDERS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export const config = envSchema.parse(process.env);
