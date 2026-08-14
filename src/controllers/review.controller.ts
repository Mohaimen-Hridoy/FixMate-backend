import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import * as reviewService from "@/services/review.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const review = await reviewService.createReview(req.user.id, req.body);
  return sendSuccess(res, 201, { review });
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const items = await reviewService.getReviewsForCustomer(req.user.id);
  return sendSuccess(res, 200, { items });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  // req.query was already validated (exactly one of serviceId/providerId) by reviewQuerySchema.
  const { serviceId, providerId } = req.query as { serviceId?: string; providerId?: string };
  const items = serviceId
    ? await reviewService.getReviewsForService(serviceId)
    : await reviewService.getReviewsForProvider(providerId as string);
  return sendSuccess(res, 200, { items });
});
