import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const formatClientUrl = (val: unknown): string => {
  if (typeof val !== "string" || !val.trim()) return "http://localhost:3000";
  let url = val.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = /^(localhost|127\.0\.0\.1)/i.test(url) ? `http://${url}` : `https://${url}`;
  }
  return url.replace(/\/+$/, "");
};

// Fail fast at boot if required environment variables are missing or
// malformed, instead of surfacing a confusing error deep inside a request.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default("/api/v1"),
  CLIENT_URL: z.preprocess(formatClientUrl, z.string().url()).default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // ── Auth (Part 2) ──
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Optional — Google Sign-In stays disabled (POST /auth/google returns 400)
  // until both are set, everything else in the auth module works without it.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

export let envConfigError: Record<string, string[]> | null = null;

if (!parsed.success) {
  envConfigError = parsed.error.flatten().fieldErrors;
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:");
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(envConfigError, null, 2));
}

const fallbackEnv: EnvConfig = {
  NODE_ENV: (process.env.NODE_ENV as any) || "development",
  PORT: Number(process.env.PORT) || 5000,
  API_PREFIX: process.env.API_PREFIX || "/api/v1",
  CLIENT_URL: formatClientUrl(process.env.CLIENT_URL || "http://localhost:3000"),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "default_fallback_jwt_access_secret_16chars",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "default_fallback_jwt_refresh_secret_16chars",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};

export const env: EnvConfig = parsed.success ? parsed.data : fallbackEnv;
export const isProd = env.NODE_ENV === "production";
export const isGoogleAuthEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

