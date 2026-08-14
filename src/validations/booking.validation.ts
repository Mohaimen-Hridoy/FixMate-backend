import { z } from "zod";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Mirrors `bookingSchema` in the Phase 10 frontend's `src/lib/validation.ts`
 * plus `serviceId`. The booking panel (`src/app/services/[slug]/booking-panel.tsx`)
 * derives every other `NewBookingInput` field — serviceSlug, serviceTitle,
 * providerId, providerName, amount, customerName — from the service already
 * on screen and the logged-in customer; the server does the same here from
 * `serviceId` + the authenticated user rather than trusting them from the
 * client (see `createBooking` in `src/services/booking.service.ts`).
 */
export const createBookingBodySchema = z
  .object({
    serviceId: z.string().min(1, "Missing service"),
    date: z.string().min(1, "Pick a date for the visit"),
    time: z.string().min(1, "Pick a time for the visit"),
    address: z.string().min(3, "Add the address where the job will happen"),
    notes: z.string().optional(),
  })
  .refine((data) => data.date >= todayIso(), {
    message: "Choose a date today or later.",
    path: ["date"],
  });
export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

/**
 * Provider-only forward transitions — the actions `BookingStatusActions`
 * (`src/components/booking-status-actions.tsx`) can trigger: accept/reject
 * a pending request, start an accepted job, mark an in-progress one
 * complete. "Cancelled" is deliberately excluded — only the customer can
 * cancel, via `POST /bookings/mine/:id/cancel`. The real transition check
 * (can THIS status move to THAT one) lives in `NEXT_STATUSES`
 * (`src/utils/bookingStatus.ts`), not here — this only bounds the shape.
 */
export const updateBookingStatusBodySchema = z.object({
  status: z.enum(["Accepted", "Rejected", "In Progress", "Completed"]),
  note: z.string().optional(),
});
export type UpdateBookingStatusBody = z.infer<typeof updateBookingStatusBodySchema>;

/** `POST /bookings/mine/:id/cancel` — mirrors `cancelBooking(id, reason?)` in the bookings store. */
export const cancelBookingBodySchema = z.object({
  reason: z.string().optional(),
});
export type CancelBookingBody = z.infer<typeof cancelBookingBodySchema>;
