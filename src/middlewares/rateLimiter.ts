import rateLimit from "express-rate-limit";
import { ApiError } from "@/utils/ApiError";

/**
 * Applied to /register, /login, /google — the endpoints worth throttling
 * against brute-force/credential-stuffing. /refresh and /logout are left
 * unlimited since they require a valid httpOnly cookie already.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooMany("Too many attempts — please wait a few minutes and try again"));
  },
});
