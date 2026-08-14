import { Response } from "express";
import ms from "ms";
import { env, isProd } from "@/config/env";

export const REFRESH_COOKIE_NAME = "fixmate_refresh_token";

// Scoped to the auth routes only — the browser never attaches this cookie
// to /services, /bookings, etc, which keeps the blast radius of any CSRF
// on another endpoint from touching it.
const COOKIE_PATH = `${env.API_PREFIX}/auth`;

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: ms(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
  });
}
