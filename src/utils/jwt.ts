import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { Role } from "@prisma/client";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired session — please log in again");
  }
}
