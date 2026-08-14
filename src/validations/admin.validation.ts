import { z } from "zod";

/** `GET /admin/users` — mirrors the admin Users table's search + role filter. */
export const adminUserQuerySchema = z.object({
  q: z.string().trim().optional(),
  role: z.enum(["customer", "provider", "admin"]).optional(),
});
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;

/** `PATCH /admin/users/:id/status` — the Users table's Active/Suspended toggle. */
export const updateUserStatusBodySchema = z.object({
  status: z.enum(["Active", "Suspended"]),
});
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusBodySchema>;

/** `GET /admin/providers` — mirrors the admin Providers table's search + category filter. */
export const adminProviderQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
});
export type AdminProviderQuery = z.infer<typeof adminProviderQuerySchema>;

/** `PATCH /admin/providers/:id/verify` — the Providers table's verified toggle. */
export const setProviderVerifiedBodySchema = z.object({
  verified: z.boolean(),
});
export type SetProviderVerifiedBody = z.infer<typeof setProviderVerifiedBodySchema>;

/** `GET /admin/services` — mirrors the admin Services table's filters. */
export const adminServiceQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
  availability: z.enum(["all", "available", "unavailable"]).optional(),
});
export type AdminServiceQuery = z.infer<typeof adminServiceQuerySchema>;

/** `PATCH /admin/services/:id` — admin override of a service's availability (moderation, not ownership). */
export const adminServiceUpdateBodySchema = z.object({
  available: z.boolean(),
});
export type AdminServiceUpdateBody = z.infer<typeof adminServiceUpdateBodySchema>;

/** `GET /admin/bookings` — mirrors the admin Bookings table's status filter. */
export const adminBookingQuerySchema = z.object({
  status: z
    .enum(["Pending", "Accepted", "Rejected", "In Progress", "Completed", "Cancelled"])
    .optional(),
});
export type AdminBookingQuery = z.infer<typeof adminBookingQuerySchema>;

/** `GET /admin/reviews` — mirrors the admin Reviews table's search + rating filter. */
export const adminReviewQuerySchema = z.object({
  q: z.string().trim().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
});
export type AdminReviewQuery = z.infer<typeof adminReviewQuerySchema>;
