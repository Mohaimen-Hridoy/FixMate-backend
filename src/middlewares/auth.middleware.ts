import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "@/utils/jwt";
import { ApiError } from "@/utils/ApiError";
import { asyncHandler } from "@/utils/asyncHandler";

/**
 * Reads the `Authorization: Bearer <accessToken>` header, verifies it, and
 * attaches `req.user`. Stateless — deliberately does not touch the DB on
 * every request; a revoked/deleted account stays valid until its short-lived
 * access token expires (by design — see JWT_ACCESS_EXPIRES_IN), at which
 * point /auth/refresh is the DB-backed checkpoint (RefreshToken lookup).
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = verifyAccessToken(token);

  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
});

/** Mount after `authenticate`. Usage: `authorize(Role.ADMIN)`, `authorize(Role.ADMIN, Role.PROVIDER)`. */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden("You don't have permission to perform this action");
    }
    next();
  };
}
