import { BookingStatus as DbBookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import type { CreateReviewBody } from "@/validations/review.validation";

const reviewWithRelations = Prisma.validator<Prisma.ReviewDefaultArgs>()({
  include: { customer: true, service: true },
});
type ReviewWithRelations = Prisma.ReviewGetPayload<typeof reviewWithRelations>;

/**
 * Maps a Review row (+ customer/service relations) onto the exact `Review`
 * shape in the frontend's `src/lib/data.ts`. `providerId` isn't a column on
 * `Review` itself — it's joined in from `service.providerId` — and
 * `customerName` comes from the related `User`, same pattern as
 * `toBookingDto` in `booking.service.ts`.
 */
function toReviewDto(review: ReviewWithRelations) {
  return {
    id: review.id,
    serviceId: review.serviceId,
    providerId: review.service.providerId,
    bookingId: review.bookingId,
    customerName: review.customer.name,
    rating: review.rating,
    comment: review.comment,
    date: review.createdAt.toISOString().slice(0, 10),
  };
}
export type ReviewDto = ReturnType<typeof toReviewDto>;

export async function getReviewsForService(serviceId: string): Promise<ReviewDto[]> {
  const list = await prisma.review.findMany({
    where: { serviceId },
    include: reviewWithRelations.include,
    orderBy: { createdAt: "desc" },
  });
  return list.map(toReviewDto);
}

export async function getReviewsForProvider(providerId: string): Promise<ReviewDto[]> {
  const list = await prisma.review.findMany({
    where: { service: { providerId } },
    include: reviewWithRelations.include,
    orderBy: { createdAt: "desc" },
  });
  return list.map(toReviewDto);
}

/** Powers the customer dashboard's "My reviews" tab — everything the caller has written. */
export async function getReviewsForCustomer(customerId: string): Promise<ReviewDto[]> {
  const list = await prisma.review.findMany({
    where: { customerId },
    include: reviewWithRelations.include,
    orderBy: { createdAt: "desc" },
  });
  return list.map(toReviewDto);
}

/** Admin-only — every review platform-wide, for the admin dashboard's Reviews tab. */
export async function getAllReviewsAdmin(): Promise<ReviewDto[]> {
  const list = await prisma.review.findMany({
    include: reviewWithRelations.include,
    orderBy: { createdAt: "desc" },
  });
  return list.map(toReviewDto);
}

/**
 * Blends a new rating into an existing seed-style aggregate — identical
 * formula to `blendRating` in the frontend's `src/lib/data.ts`, which
 * exists so one new review doesn't swing a long-running average (e.g. a
 * 200-review 4.8) down to whatever the single newest rating happens to be.
 * Here it's also just the correct incremental-average update, since
 * `Service.rating`/`reviewCount` (and the same pair on `ProviderProfile`)
 * are the real running aggregate, not a stand-in for missing history.
 */
function blendRating(oldRating: number, oldCount: number, newRating: number) {
  const newCount = oldCount + 1;
  const blended = (oldRating * oldCount + newRating) / newCount;
  return { rating: Math.round(blended * 10) / 10, count: newCount };
}

/** Exact inverse of `blendRating` — removes one rating from a running average. */
function unblendRating(currentRating: number, currentCount: number, removedRating: number) {
  const newCount = Math.max(0, currentCount - 1);
  if (newCount === 0) return { rating: 0, count: 0 };
  const blended = (currentRating * currentCount - removedRating) / newCount;
  return { rating: Math.round(blended * 10) / 10, count: newCount };
}

/**
 * Admin-only moderation — removes a review, un-blends it out of the
 * service's and provider's aggregates (the exact inverse of the blend
 * `createReview` applied), and flips the booking's `reviewed` flag back
 * off so the customer could, in principle, be asked to re-review.
 */
export async function deleteReviewAdmin(id: string): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id },
    include: { service: { include: { provider: true } } },
  });
  if (!review) throw ApiError.notFound("Review not found");

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    await tx.booking.update({ where: { id: review.bookingId }, data: { reviewed: false } });

    const serviceUnblend = unblendRating(review.service.rating, review.service.reviewCount, review.rating);
    await tx.service.update({
      where: { id: review.serviceId },
      data: { rating: serviceUnblend.rating, reviewCount: serviceUnblend.count },
    });

    const providerUnblend = unblendRating(
      review.service.provider.rating,
      review.service.provider.reviewCount,
      review.rating,
    );
    await tx.providerProfile.update({
      where: { id: review.service.providerId },
      data: { rating: providerUnblend.rating, reviewCount: providerUnblend.count },
    });
  });
}

/**
 * Creates a review tied to a completed booking the caller owns, flips
 * `Booking.reviewed`, and recalculates both the service's and the
 * provider's denormalized `rating`/`reviewCount`. Idempotent by design —
 * `Review.bookingId` is unique, and a second submission for the same
 * booking (e.g. a double-click) just returns the review already on file
 * instead of erroring, mirroring the frontend's `addReview` guard in
 * `src/lib/reviews-store.tsx`.
 */
export async function createReview(customerId: string, input: CreateReviewBody): Promise<ReviewDto> {
  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, customerId },
    include: { service: { include: { provider: true } } },
  });
  if (!booking) throw ApiError.notFound("Booking not found");

  const existing = await prisma.review.findUnique({
    where: { bookingId: booking.id },
    include: reviewWithRelations.include,
  });
  if (existing) return toReviewDto(existing);

  if (booking.status !== DbBookingStatus.COMPLETED) {
    throw ApiError.badRequest("Only completed bookings can be reviewed");
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        rating: input.rating,
        comment: input.comment,
        customerId,
        serviceId: booking.serviceId,
        bookingId: booking.id,
      },
      include: reviewWithRelations.include,
    });

    await tx.booking.update({ where: { id: booking.id }, data: { reviewed: true } });

    const serviceBlend = blendRating(booking.service.rating, booking.service.reviewCount, input.rating);
    await tx.service.update({
      where: { id: booking.serviceId },
      data: { rating: serviceBlend.rating, reviewCount: serviceBlend.count },
    });

    const providerBlend = blendRating(
      booking.service.provider.rating,
      booking.service.provider.reviewCount,
      input.rating,
    );
    await tx.providerProfile.update({
      where: { id: booking.service.providerId },
      data: { rating: providerBlend.rating, reviewCount: providerBlend.count },
    });

    return created;
  });

  return toReviewDto(review);
}
