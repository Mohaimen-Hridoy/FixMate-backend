import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import * as adminService from "@/services/admin.service";
import * as serviceService from "@/services/service.service";
import * as bookingService from "@/services/booking.service";
import * as reviewService from "@/services/review.service";
import type {
  AdminBookingQuery,
  AdminProviderQuery,
  AdminReviewQuery,
  AdminServiceQuery,
  AdminUserQuery,
} from "@/validations/admin.validation";

/* Users */

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const items = await adminService.listUsers(req.query as unknown as AdminUserQuery);
  return sendSuccess(res, 200, { items });
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.setUserStatus(req.params.id, req.body.status);
  return sendSuccess(res, 200, { user });
});

/* Providers */

export const listProviders = asyncHandler(async (req: Request, res: Response) => {
  const items = await adminService.listProviders(req.query as unknown as AdminProviderQuery);
  return sendSuccess(res, 200, { items });
});

export const setProviderVerified = asyncHandler(async (req: Request, res: Response) => {
  const provider = await adminService.setProviderVerified(req.params.id, req.body.verified);
  return sendSuccess(res, 200, { provider });
});

/* Services */

export const listServices = asyncHandler(async (req: Request, res: Response) => {
  const items = await serviceService.listServicesAdmin(req.query as unknown as AdminServiceQuery);
  return sendSuccess(res, 200, { items });
});

export const setServiceAvailability = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.setServiceAvailabilityAdmin(req.params.id, req.body.available);
  return sendSuccess(res, 200, { service });
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  await serviceService.deleteServiceAdmin(req.params.id);
  return sendSuccess(res, 200, { deleted: true });
});

/* Bookings */

export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query as unknown as AdminBookingQuery;
  const items = await bookingService.listBookingsAdmin(status);
  return sendSuccess(res, 200, { items });
});

/* Reviews */

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const { q = "", minRating = 0 } = req.query as unknown as AdminReviewQuery;
  const all = await reviewService.getAllReviewsAdmin();
  const needle = q.trim().toLowerCase();
  const items = all.filter(
    (r) =>
      r.rating >= minRating &&
      (!needle || r.comment.toLowerCase().includes(needle) || r.customerName.toLowerCase().includes(needle)),
  );
  return sendSuccess(res, 200, { items });
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.deleteReviewAdmin(req.params.id);
  return sendSuccess(res, 200, { deleted: true });
});

/* Analytics */

export const analytics = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getAnalytics();
  return sendSuccess(res, 200, data);
});
