import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import { clearRefreshCookie, REFRESH_COOKIE_NAME, setRefreshCookie } from "@/utils/cookies";
import * as authService from "@/services/auth.service";
import { ApiError } from "@/utils/ApiError";

/** The refresh token lives only in the httpOnly cookie — never in the JSON body. */
function respondWithSession(res: Response, statusCode: number, result: authService.AuthResult) {
  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, statusCode, { user: result.user, accessToken: result.accessToken });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);
  return respondWithSession(res, 201, result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  return respondWithSession(res, 200, result);
});

export const google = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.googleAuth(req.body);
  return respondWithSession(res, 200, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refreshSession(req.cookies?.[REFRESH_COOKIE_NAME]);
  return respondWithSession(res, 200, result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutUser(req.cookies?.[REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  return sendSuccess(res, 200, { loggedOut: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const user = await authService.getMe(req.user.id);
  return sendSuccess(res, 200, { user });
});
