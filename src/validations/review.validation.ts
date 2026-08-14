import { z } from "zod";

/**
 * Mirrors `reviewSchema` in the Phase 10 frontend's `src/lib/validation.ts`
 * plus `bookingId`. `ReviewModal` derives `serviceId`/`providerId` from the
 * booking it was opened for; the server does the same here from
 * `bookingId` + the authenticated customer rather than trusting them from
 * the client (see `createReview` in `src/services/review.service.ts`).
 */
export const createReviewBodySchema = z.object({
  bookingId: z.string().min(1, "Missing booking"),
  rating: z.number({ invalid_type_error: "Pick a star rating" }).min(1, "Pick a star rating").max(5),
  comment: z.string().min(5, "Write at least a few words"),
});
export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;

/**
 * `GET /reviews` — mirrors the frontend's `getReviewsForService` /
 * `getReviewsForProvider` (`src/lib/reviews-store.tsx`): exactly one of
 * `serviceId` or `providerId` selects which list comes back.
 */
export const reviewQuerySchema = z
  .object({
    serviceId: z.string().optional(),
    providerId: z.string().optional(),
  })
  .refine((data) => Boolean(data.serviceId) !== Boolean(data.providerId), {
    message: "Provide exactly one of serviceId or providerId",
  });
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
