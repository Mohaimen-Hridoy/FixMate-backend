import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import * as providerService from "@/services/provider.service";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const provider = await providerService.getMyProfile(req.user.id);
  return sendSuccess(res, 200, { provider });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const provider = await providerService.updateMyProfile(req.user.id, req.body);
  return sendSuccess(res, 200, { provider });
});

export const earnings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const data = await providerService.getMyEarnings(req.user.id);
  return sendSuccess(res, 200, data);
});

export const featured = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const items = await providerService.getFeaturedProviders(limit);
  return sendSuccess(res, 200, { items });
});

export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
  const provider = await providerService.getPublicProfile(req.params.id);
  return sendSuccess(res, 200, { provider });
});
