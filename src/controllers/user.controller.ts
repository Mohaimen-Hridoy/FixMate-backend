import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import * as userService from "@/services/user.service";

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const user = await userService.updateMe(req.user.id, req.body);
  return sendSuccess(res, 200, { user });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  await userService.changePassword(req.user.id, req.body);
  return sendSuccess(res, 200, { changed: true });
});
