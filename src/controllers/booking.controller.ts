import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import * as bookingService from "@/services/booking.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const booking = await bookingService.createBooking(req.user.id, req.body);
  return sendSuccess(res, 201, { booking });
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const items = await bookingService.getBookingsForCustomer(req.user.id);
  return sendSuccess(res, 200, { items });
});

export const mineById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const booking = await bookingService.getCustomerBookingById(req.user.id, req.params.id);
  return sendSuccess(res, 200, { booking });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const booking = await bookingService.cancelBooking(req.user.id, req.params.id, req.body?.reason);
  return sendSuccess(res, 200, { booking });
});

export const provider = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const items = await bookingService.getBookingsForProvider(req.user.id);
  return sendSuccess(res, 200, { items });
});

export const providerById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const booking = await bookingService.getProviderBookingById(req.user.id, req.params.id);
  return sendSuccess(res, 200, { booking });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const booking = await bookingService.updateBookingStatus(req.user.id, req.params.id, req.body.status, req.body.note);
  return sendSuccess(res, 200, { booking });
});
