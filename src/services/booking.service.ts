import { BookingStatus as DbBookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import {
  canCustomerCancel,
  NEXT_STATUSES,
  toClientBookingStatus,
  toDbBookingStatus,
  type BookingHistoryEntry,
  type ClientBookingStatus,
} from "@/utils/bookingStatus";
import type { CreateBookingBody } from "@/validations/booking.validation";

const bookingWithRelations = Prisma.validator<Prisma.BookingDefaultArgs>()({
  include: { service: { include: { provider: true } }, customer: true },
});
type BookingWithRelations = Prisma.BookingGetPayload<typeof bookingWithRelations>;

/**
 * Maps a Booking row (+ its Service/ProviderProfile/User relations) onto
 * the exact `Booking` shape in the frontend's `src/lib/data.ts` — the
 * frontend keeps `serviceTitle`, `providerName`, etc. denormalized onto
 * the booking itself; here they're joined in at read time instead so the
 * database only stores the ids.
 */
function toBookingDto(booking: BookingWithRelations) {
  return {
    id: booking.id,
    serviceId: booking.serviceId,
    serviceSlug: booking.service.slug,
    serviceTitle: booking.service.title,
    category: booking.service.categorySlug,
    providerId: booking.service.providerId,
    providerName: booking.service.provider.businessName,
    customerName: booking.customer.name,
    address: booking.address,
    notes: booking.notes ?? undefined,
    date: booking.date.toISOString().slice(0, 10),
    time: booking.time,
    amount: Number(booking.amount),
    status: toClientBookingStatus(booking.status),
    createdAt: booking.createdAt.toISOString(),
    reviewed: booking.reviewed,
    history: (Array.isArray(booking.history) ? booking.history : []) as unknown as BookingHistoryEntry[],
  };
}
export type BookingDto = ReturnType<typeof toBookingDto>;

function appendHistory(existing: Prisma.JsonValue, entry: BookingHistoryEntry): Prisma.InputJsonValue {
  const history = Array.isArray(existing) ? (existing as unknown as BookingHistoryEntry[]) : [];
  return [...history, entry] as unknown as Prisma.InputJsonValue;
}

export async function createBooking(customerId: string, input: CreateBookingBody): Promise<BookingDto> {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw ApiError.notFound("Service not found");
  if (!service.available) {
    throw ApiError.badRequest("This service isn't currently accepting new bookings");
  }

  const now = new Date();
  const initialHistory: BookingHistoryEntry[] = [{ status: "Pending", at: now.toISOString(), note: "Booking submitted" }];

  const booking = await prisma.booking.create({
    data: {
      status: DbBookingStatus.PENDING,
      date: new Date(`${input.date}T00:00:00.000Z`),
      time: input.time,
      address: input.address,
      notes: input.notes,
      amount: service.price,
      reviewed: false,
      history: initialHistory as unknown as Prisma.InputJsonValue,
      customerId,
      serviceId: service.id,
    },
    include: bookingWithRelations.include,
  });

  return toBookingDto(booking);
}

export async function getBookingsForCustomer(customerId: string): Promise<BookingDto[]> {
  const list = await prisma.booking.findMany({
    where: { customerId },
    include: bookingWithRelations.include,
    orderBy: { createdAt: "desc" },
  });
  return list.map(toBookingDto);
}

export async function getCustomerBookingById(customerId: string, id: string): Promise<BookingDto> {
  const booking = await prisma.booking.findFirst({
    where: { id, customerId },
    include: bookingWithRelations.include,
  });
  if (!booking) throw ApiError.notFound("Booking not found");
  return toBookingDto(booking);
}

export async function cancelBooking(customerId: string, id: string, reason?: string): Promise<BookingDto> {
  const existing = await prisma.booking.findFirst({ where: { id, customerId } });
  if (!existing) throw ApiError.notFound("Booking not found");

  const currentStatus = toClientBookingStatus(existing.status);
  if (!canCustomerCancel(currentStatus)) {
    throw ApiError.badRequest(`A booking that's already "${currentStatus}" can no longer be cancelled`);
  }

  const historyEntry: BookingHistoryEntry = {
    status: "Cancelled",
    at: new Date().toISOString(),
    note: reason?.trim() || "Cancelled by customer",
  };

  const booking = await prisma.booking.update({
    where: { id: existing.id },
    data: {
      status: DbBookingStatus.CANCELLED,
      history: appendHistory(existing.history, historyEntry),
    },
    include: bookingWithRelations.include,
  });

  return toBookingDto(booking);
}

/** Admin-only — every booking platform-wide, for the admin dashboard's Bookings tab. */
export async function listBookingsAdmin(status?: ClientBookingStatus): Promise<BookingDto[]> {
  const list = await prisma.booking.findMany({
    where: status ? { status: toDbBookingStatus(status) } : undefined,
    include: bookingWithRelations.include,
    orderBy: { createdAt: "desc" },
  });
  return list.map(toBookingDto);
}

/** Every provider-side lookup below is gated to the caller's own ProviderProfile. */
async function getOwnProviderProfile(userId: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw ApiError.forbidden("Only providers with a business profile can manage bookings");
  }
  return profile;
}

export async function getBookingsForProvider(userId: string): Promise<BookingDto[]> {
  const profile = await getOwnProviderProfile(userId);
  const list = await prisma.booking.findMany({
    where: { service: { providerId: profile.id } },
    include: bookingWithRelations.include,
    orderBy: { createdAt: "desc" },
  });
  return list.map(toBookingDto);
}

export async function getProviderBookingById(userId: string, id: string): Promise<BookingDto> {
  const profile = await getOwnProviderProfile(userId);
  const booking = await prisma.booking.findFirst({
    where: { id, service: { providerId: profile.id } },
    include: bookingWithRelations.include,
  });
  if (!booking) throw ApiError.notFound("Booking not found");
  return toBookingDto(booking);
}

export async function updateBookingStatus(
  userId: string,
  id: string,
  status: ClientBookingStatus,
  note?: string,
): Promise<BookingDto> {
  const profile = await getOwnProviderProfile(userId);
  const existing = await prisma.booking.findFirst({ where: { id, service: { providerId: profile.id } } });
  if (!existing) throw ApiError.notFound("Booking not found");

  const currentStatus = toClientBookingStatus(existing.status);
  const allowed = NEXT_STATUSES[currentStatus];
  if (!allowed.includes(status)) {
    throw ApiError.badRequest(`A booking that's "${currentStatus}" can't move to "${status}"`);
  }

  const historyEntry: BookingHistoryEntry = { status, at: new Date().toISOString(), note };

  const booking = await prisma.booking.update({
    where: { id: existing.id },
    data: {
      status: toDbBookingStatus(status),
      history: appendHistory(existing.history, historyEntry),
    },
    include: bookingWithRelations.include,
  });

  return toBookingDto(booking);
}
