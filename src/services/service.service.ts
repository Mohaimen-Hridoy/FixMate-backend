import { Prisma, PriceUnit } from "@prisma/client";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import { slugify } from "@/utils/slugify";
import type { ServiceBody, ServiceQuery, ServiceUpdateBody } from "@/validations/service.validation";

const serviceWithProvider = Prisma.validator<Prisma.ServiceDefaultArgs>()({
  include: { provider: true },
});
type ServiceWithProvider = Prisma.ServiceGetPayload<typeof serviceWithProvider>;

// Mirrors DEFAULT_PAGE_SIZE / DEFAULT_MAX_PRICE in the frontend's src/lib/api.ts.
export const DEFAULT_PAGE_SIZE = 6;
export const DEFAULT_MAX_PRICE = 5000;

/**
 * Maps a Service+ProviderProfile row onto the exact `Service` (and nested
 * `Provider`) shape defined in the frontend's `src/lib/data.ts`, so this is
 * the only place that boundary is crossed — same role `toPublicUser` plays
 * for auth in `src/utils/sanitize.ts`.
 */
function toServiceDto(service: ServiceWithProvider) {
  return {
    id: service.id,
    slug: service.slug,
    title: service.title,
    category: service.categorySlug,
    shortDescription: service.shortDescription,
    description: service.description,
    price: Number(service.price),
    priceUnit: service.priceUnit,
    location: service.location,
    rating: service.rating,
    reviewCount: service.reviewCount,
    available: service.available,
    features: service.features,
    provider: {
      id: service.provider.id,
      name: service.provider.businessName,
      avatarInitial: service.provider.avatarInitial,
      category: service.provider.categorySlug,
      rating: service.provider.rating,
      reviewCount: service.provider.reviewCount,
      location: service.provider.location,
      yearsActive: service.provider.yearsActive,
      verified: service.provider.verified,
      bio: service.provider.bio,
      jobsCompleted: service.provider.jobsCompleted,
      responseTime: service.provider.responseTime,
      serviceAreas: service.provider.serviceAreas,
    },
  };
}
export type ServiceDto = ReturnType<typeof toServiceDto>;

export type ServiceQueryResult = {
  items: ServiceDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Server-side twin of `queryServices` in the frontend's `src/lib/api.ts`.
 * The numeric/category/location filters run in SQL; the free-text match
 * and sort (including "recommended"'s `rating * log10(reviewCount + 1)`
 * ranking, which isn't a plain `ORDER BY`) are applied in JS afterward so
 * the behavior matches the frontend's pure function sentence-for-sentence.
 * `GET /services` is this function's HTTP face — see service.controller.ts.
 */
export async function queryServices(query: ServiceQuery): Promise<ServiceQueryResult> {
  const {
    q = "",
    category = "all",
    location = "all",
    providerId,
    maxPrice = DEFAULT_MAX_PRICE,
    minRating = 0,
    sort = "recommended",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = query;

  const needle = q.trim().toLowerCase();

  const where: Prisma.ServiceWhereInput = {
    price: { lte: maxPrice },
    rating: { gte: minRating },
    ...(category !== "all" ? { categorySlug: category } : {}),
    ...(location !== "all" ? { location } : {}),
    ...(providerId ? { providerId } : {}),
  };

  const candidates = await prisma.service.findMany({ where, include: { provider: true } });

  let list = needle
    ? candidates.filter(
        (s) =>
          s.title.toLowerCase().includes(needle) ||
          s.provider.businessName.toLowerCase().includes(needle) ||
          s.shortDescription.toLowerCase().includes(needle) ||
          s.categorySlug.toLowerCase().includes(needle),
      )
    : candidates;

  switch (sort) {
    case "price-asc":
      list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "price-desc":
      list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case "rating":
      list = [...list].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case "newest":
      list = [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    default:
      // "Recommended": surface higher-rated, more-reviewed, available services first.
      list = [...list].sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return b.rating * Math.log10(b.reviewCount + 1) - a.rating * Math.log10(a.reviewCount + 1);
      });
      break;
  }

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const items = list.slice((safePage - 1) * pageSize, safePage * pageSize).map(toServiceDto);

  return { items, total, page: safePage, pageSize, totalPages };
}

/**
 * `GET /services/locations` — public. Mirrors the frontend's `locations`
 * export in `src/lib/data.ts` (unique service areas, for the Explore filter).
 */
export async function listLocations(): Promise<string[]> {
  const rows = await prisma.service.findMany({
    distinct: ["location"],
    select: { location: true },
    orderBy: { location: "asc" },
  });
  return rows.map((r) => r.location).filter(Boolean).sort();
}

export async function getServiceBySlug(slug: string): Promise<ServiceDto> {
  const service = await prisma.service.findUnique({ where: { slug }, include: { provider: true } });
  if (!service) throw ApiError.notFound("Service not found");
  return toServiceDto(service);
}

/** Powers the "related services" panel on the service detail page. */
export async function getRelatedServices(category: string, excludeId: string): Promise<ServiceDto[]> {
  const list = await prisma.service.findMany({
    where: { categorySlug: category, id: { not: excludeId } },
    include: { provider: true },
  });
  return list.map(toServiceDto);
}

/** Every mutating endpoint below is gated to the caller's own ProviderProfile. */
async function getOwnProviderProfile(userId: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw ApiError.forbidden("Only providers with a business profile can manage services");
  }
  return profile;
}

export async function getServicesByProvider(userId: string): Promise<ServiceDto[]> {
  const profile = await getOwnProviderProfile(userId);
  const list = await prisma.service.findMany({
    where: { providerId: profile.id },
    include: { provider: true },
    orderBy: { createdAt: "desc" },
  });
  return list.map(toServiceDto);
}

export async function getOwnServiceById(userId: string, id: string): Promise<ServiceDto> {
  const profile = await getOwnProviderProfile(userId);
  const service = await prisma.service.findFirst({
    where: { id, providerId: profile.id },
    include: { provider: true },
  });
  if (!service) throw ApiError.notFound("Service not found");
  return toServiceDto(service);
}

/** Keeps `Category.count` (the Explore filter's denormalized cache) in sync with actual Service rows. */
async function bumpCategoryCount(tx: Prisma.TransactionClient, categorySlug: string, delta: number) {
  await tx.category.updateMany({ where: { slug: categorySlug }, data: { count: { increment: delta } } });
}

async function uniqueServiceSlug(title: string): Promise<string> {
  const root = slugify(title) || "service";
  let candidate = root;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.service.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return candidate;
}

export async function createService(userId: string, input: ServiceBody): Promise<ServiceDto> {
  const profile = await getOwnProviderProfile(userId);
  const slug = await uniqueServiceSlug(input.title);

  const service = await prisma.$transaction(async (tx) => {
    const created = await tx.service.create({
      data: {
        slug,
        title: input.title,
        categorySlug: input.category,
        shortDescription: input.shortDescription,
        description: input.description ?? "",
        price: input.price,
        priceUnit: input.priceUnit as PriceUnit,
        location: input.location,
        available: input.available,
        features: input.features ?? [],
        providerId: profile.id,
      },
      include: { provider: true },
    });
    await bumpCategoryCount(tx, input.category, 1);
    return created;
  });

  return toServiceDto(service);
}

export async function updateService(userId: string, id: string, input: ServiceUpdateBody): Promise<ServiceDto> {
  const profile = await getOwnProviderProfile(userId);
  const existing = await prisma.service.findFirst({ where: { id, providerId: profile.id } });
  if (!existing) throw ApiError.notFound("Service not found");

  const data: Prisma.ServiceUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.category !== undefined) data.categorySlug = input.category;
  if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
  if (input.description !== undefined) data.description = input.description;
  if (input.price !== undefined) data.price = input.price;
  if (input.priceUnit !== undefined) data.priceUnit = input.priceUnit as PriceUnit;
  if (input.location !== undefined) data.location = input.location;
  if (input.available !== undefined) data.available = input.available;
  if (input.features !== undefined) data.features = input.features;

  const service = await prisma.$transaction(async (tx) => {
    const updated = await tx.service.update({ where: { id: existing.id }, data, include: { provider: true } });
    // Category changed: keep both categories' denormalized counts correct.
    if (input.category !== undefined && input.category !== existing.categorySlug) {
      await bumpCategoryCount(tx, existing.categorySlug, -1);
      await bumpCategoryCount(tx, input.category, 1);
    }
    return updated;
  });

  return toServiceDto(service);
}

/**
 * Admin-only — every service platform-wide (no provider-ownership scoping),
 * for the admin dashboard's Services tab. Filtering mirrors the page's
 * client-side `filtered` memo (`q` over title/provider name, `category`,
 * `availability`).
 */
export async function listServicesAdmin(query: {
  q?: string;
  category?: string;
  availability?: "all" | "available" | "unavailable";
}): Promise<ServiceDto[]> {
  const { q = "", category = "all", availability = "all" } = query;
  const needle = q.trim().toLowerCase();

  const where: Prisma.ServiceWhereInput = {
    ...(category !== "all" ? { categorySlug: category } : {}),
    ...(availability !== "all" ? { available: availability === "available" } : {}),
  };

  const list = await prisma.service.findMany({
    where,
    include: { provider: true },
    orderBy: { createdAt: "desc" },
  });

  const filtered = needle
    ? list.filter(
        (s) => s.title.toLowerCase().includes(needle) || s.provider.businessName.toLowerCase().includes(needle),
      )
    : list;

  return filtered.map(toServiceDto);
}

/** Admin override — moderation, not ownership-gated like `updateService`. */
export async function setServiceAvailabilityAdmin(id: string, available: boolean): Promise<ServiceDto> {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Service not found");
  const service = await prisma.service.update({ where: { id }, data: { available }, include: { provider: true } });
  return toServiceDto(service);
}

/** Admin override — removes any service regardless of owner (moderation takedown). */
export async function deleteServiceAdmin(id: string): Promise<void> {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Service not found");

  await prisma.$transaction(async (tx) => {
    await tx.service.delete({ where: { id } });
    await bumpCategoryCount(tx, existing.categorySlug, -1);
  });
}

export async function deleteService(userId: string, id: string): Promise<void> {
  const profile = await getOwnProviderProfile(userId);
  const existing = await prisma.service.findFirst({ where: { id, providerId: profile.id } });
  if (!existing) throw ApiError.notFound("Service not found");

  await prisma.$transaction(async (tx) => {
    await tx.service.delete({ where: { id: existing.id } });
    await bumpCategoryCount(tx, existing.categorySlug, -1);
  });
}
