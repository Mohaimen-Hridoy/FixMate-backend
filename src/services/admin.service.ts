import { BookingStatus as DbBookingStatus, Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import { toClientRole, toDbRole, type ClientRole } from "@/utils/role";
import type { AdminProviderQuery, AdminUserQuery } from "@/validations/admin.validation";

/* ---------- Users ---------- */

function toClientStatus(status: UserStatus): "Active" | "Suspended" {
  return status === UserStatus.SUSPENDED ? "Suspended" : "Active";
}

/** Mirrors `AppUser` in the frontend's `src/lib/data.ts`, backing the admin Users table. */
export type AdminUserDto = {
  id: string;
  name: string;
  email: string;
  role: ClientRole;
  status: "Active" | "Suspended";
  joinedDate: string;
};

export async function listUsers(query: AdminUserQuery): Promise<AdminUserDto[]> {
  const { q = "", role } = query;
  const needle = q.trim();

  const where: Prisma.UserWhereInput = {
    ...(role ? { role: toDbRole(role) } : {}),
    ...(needle
      ? {
          OR: [
            { name: { contains: needle, mode: "insensitive" } },
            { email: { contains: needle, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" } });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: toClientRole(u.role),
    status: toClientStatus(u.status),
    joinedDate: u.createdAt.toISOString().slice(0, 10),
  }));
}

/** Admin suspends/reactivates an account — a suspended user is rejected at login (see auth.service.ts). */
export async function setUserStatus(id: string, status: "Active" | "Suspended"): Promise<AdminUserDto> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("User not found");
  if (existing.role === Role.ADMIN) {
    throw ApiError.forbidden("Admin accounts can't be suspended");
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status: status === "Suspended" ? UserStatus.SUSPENDED : UserStatus.ACTIVE },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toClientRole(user.role),
    status: toClientStatus(user.status),
    joinedDate: user.createdAt.toISOString().slice(0, 10),
  };
}

/* ---------- Providers ---------- */

const providerWithUser = Prisma.validator<Prisma.ProviderProfileDefaultArgs>()({
  include: { user: true },
});
type ProviderWithUser = Prisma.ProviderProfileGetPayload<typeof providerWithUser>;

/** Mirrors `Provider` in the frontend's `src/lib/data.ts`, plus `email` for the admin table. */
function toAdminProviderDto(profile: ProviderWithUser) {
  return {
    id: profile.id,
    name: profile.businessName,
    email: profile.user.email,
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
export type AdminProviderDto = ReturnType<typeof toAdminProviderDto>;

export async function listProviders(query: AdminProviderQuery): Promise<AdminProviderDto[]> {
  const { q = "", category = "all" } = query;
  const needle = q.trim().toLowerCase();

  const where: Prisma.ProviderProfileWhereInput = category !== "all" ? { categorySlug: category } : {};

  const list = await prisma.providerProfile.findMany({
    where,
    include: providerWithUser.include,
    orderBy: { rating: "desc" },
  });

  const filtered = needle
    ? list.filter((p) => p.businessName.toLowerCase().includes(needle) || p.location.toLowerCase().includes(needle))
    : list;

  return filtered.map(toAdminProviderDto);
}

export async function setProviderVerified(id: string, verified: boolean): Promise<AdminProviderDto> {
  const existing = await prisma.providerProfile.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Provider not found");

  const profile = await prisma.providerProfile.update({
    where: { id },
    data: { verified },
    include: providerWithUser.include,
  });
  return toAdminProviderDto(profile);
}

/* ---------- Analytics ---------- */

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

/**
 * Mirrors the shape of `platformMonthlyStats` in the frontend's
 * `src/lib/data.ts` — the last 6 calendar months (oldest first), each with
 * a bookings count, revenue sum (completed bookings only), and new-user
 * count, computed from real rows instead of the frontend's static mock.
 */
export async function getAnalytics() {
  const now = new Date();
  const months: { key: string; month: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    months.push({ key: monthKey(start), month: MONTH_LABELS[start.getUTCMonth()], start, end });
  }
  const rangeStart = months[0].start;

  const [users, bookings, totalUsers, totalProviders, totalServices, totalBookings, completedAgg, avgServiceRating] =
    await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
      prisma.booking.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { createdAt: true, status: true, amount: true },
      }),
      prisma.user.count(),
      prisma.providerProfile.count(),
      prisma.service.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({ where: { status: DbBookingStatus.COMPLETED }, _sum: { amount: true } }),
      prisma.service.aggregate({ _avg: { rating: true } }),
    ]);

  const byMonth = new Map(months.map((m) => [m.key, { month: m.month, bookings: 0, revenue: 0, newUsers: 0 }]));

  for (const u of users) {
    const bucket = byMonth.get(monthKey(u.createdAt));
    if (bucket) bucket.newUsers += 1;
  }
  for (const b of bookings) {
    const bucket = byMonth.get(monthKey(b.createdAt));
    if (!bucket) continue;
    bucket.bookings += 1;
    if (b.status === DbBookingStatus.COMPLETED) bucket.revenue += Number(b.amount);
  }

  const bookingStatusCounts = await prisma.booking.groupBy({ by: ["status"], _count: { _all: true } });
  const statusBreakdown = Object.fromEntries(
    bookingStatusCounts.map((row) => [row.status, row._count._all]),
  ) as Record<DbBookingStatus, number>;

  return {
    totals: {
      users: totalUsers,
      providers: totalProviders,
      services: totalServices,
      bookings: totalBookings,
      totalRevenue: Number(completedAgg._sum.amount ?? 0),
      avgServiceRating: Math.round((avgServiceRating._avg.rating ?? 0) * 10) / 10,
    },
    monthly: Array.from(byMonth.values()),
    bookingStatusBreakdown: {
      Pending: statusBreakdown.PENDING ?? 0,
      Accepted: statusBreakdown.ACCEPTED ?? 0,
      "In Progress": statusBreakdown.IN_PROGRESS ?? 0,
      Completed: statusBreakdown.COMPLETED ?? 0,
      Rejected: statusBreakdown.REJECTED ?? 0,
      Cancelled: statusBreakdown.CANCELLED ?? 0,
    },
  };
}
