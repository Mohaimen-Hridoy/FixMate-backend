import { BookingStatus as DbBookingStatus } from "@prisma/client";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import type { UpdateProviderProfileBody } from "@/validations/profile.validation";

async function getOwnProviderProfile(userId: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw ApiError.forbidden("Only providers with a business profile can use this");
  }
  return profile;
}

/** Mirrors `Provider` in the frontend's `src/lib/data.ts` — same shape `getProviderById` returns. */
function toProviderDto(profile: NonNullable<Awaited<ReturnType<typeof getOwnProviderProfile>>>) {
  return {
    id: profile.id,
    name: profile.businessName,
    avatarInitial: profile.avatarInitial,
    category: profile.categorySlug,
    rating: profile.rating,
    reviewCount: profile.reviewCount,
    location: profile.location,
    yearsActive: profile.yearsActive,
    verified: profile.verified,
    bio: profile.bio,
    jobsCompleted: profile.jobsCompleted,
    responseTime: profile.responseTime,
    serviceAreas: profile.serviceAreas,
  };
}

/** `GET /provider/profile` — powers the Provider Profile page's default form values. */
export async function getMyProfile(userId: string) {
  const profile = await getOwnProviderProfile(userId);
  return toProviderDto(profile);
}

/**
 * `GET /provider/:id` — public. Mirrors `getProviderById` in the frontend's
 * `src/lib/data.ts`; powers the public provider profile page.
 */
export async function getPublicProfile(id: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { id } });
  if (!profile) throw ApiError.notFound("Provider not found");
  return toProviderDto(profile);
}

/**
 * `GET /provider/featured?limit=3` — public. Mirrors `getFeaturedProviders`
 * in the frontend's `src/lib/data.ts` (top-rated providers, for the homepage).
 */
export async function getFeaturedProviders(limit = 3) {
  const list = await prisma.providerProfile.findMany({
    orderBy: { rating: "desc" },
    take: limit,
  });
  return list.map(toProviderDto);
}

/** `PATCH /provider/profile` — mirrors `providerProfileSchema` + the service-areas chip list. */
export async function updateMyProfile(userId: string, input: UpdateProviderProfileBody) {
  const profile = await getOwnProviderProfile(userId);

  const data: {
    businessName?: string;
    avatarInitial?: string;
    bio?: string;
    location?: string;
    responseTime?: string;
    serviceAreas?: string[];
  } = {};
  if (input.businessName !== undefined) {
    data.businessName = input.businessName;
    data.avatarInitial = input.businessName.trim().charAt(0).toUpperCase() || profile.avatarInitial;
  }
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.location !== undefined) data.location = input.location;
  if (input.responseTime !== undefined) data.responseTime = input.responseTime;
  if (input.serviceAreas !== undefined) data.serviceAreas = input.serviceAreas;

  const updated = await prisma.providerProfile.update({ where: { id: profile.id }, data });
  return toProviderDto(updated);
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

/**
 * `GET /provider/earnings` — mirrors `monthlyEarnings` in the frontend's
 * `src/lib/data.ts` (last 6 months, oldest first) plus a per-service
 * breakdown, computed from the caller's own completed bookings instead of
 * the frontend's static mock array.
 */
export async function getMyEarnings(userId: string) {
  const profile = await getOwnProviderProfile(userId);

  const now = new Date();
  const months: { key: string; month: string }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: monthKey(d), month: MONTH_LABELS[d.getUTCMonth()] });
  }
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const completed = await prisma.booking.findMany({
    where: {
      service: { providerId: profile.id },
      status: DbBookingStatus.COMPLETED,
    },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  const inRange = completed.filter((b) => b.createdAt >= rangeStart);

  const byMonth = new Map(months.map((m) => [m.key, { month: m.month, value: 0 }]));
  for (const b of inRange) {
    const bucket = byMonth.get(monthKey(b.createdAt));
    if (bucket) bucket.value += Number(b.amount);
  }

  const byService = new Map<string, { title: string; total: number; jobs: number }>();
  for (const b of completed) {
    const entry = byService.get(b.service.title) ?? { title: b.service.title, total: 0, jobs: 0 };
    entry.total += Number(b.amount);
    entry.jobs += 1;
    byService.set(b.service.title, entry);
  }

  const totalEarnings = completed.reduce((sum, b) => sum + Number(b.amount), 0);
  const avgJobValue = completed.length ? Math.round(totalEarnings / completed.length) : 0;

  return {
    monthlyEarnings: Array.from(byMonth.values()),
    totalEarnings,
    avgJobValue,
    completedJobs: completed.length,
    byService: Array.from(byService.values()).sort((a, b) => b.total - a.total),
    recentPayouts: completed.slice(0, 8).map((b) => ({
      id: b.id,
      serviceTitle: b.service.title,
      amount: Number(b.amount),
      date: b.createdAt.toISOString().slice(0, 10),
    })),
  };
}
