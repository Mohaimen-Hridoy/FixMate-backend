import { BookingStatus } from "@prisma/client";

/**
 * The frontend's `BookingStatus` (see `src/lib/data.ts`) has six values
 * with spaces/mixed case (`"In Progress"`), which Prisma enums can't
 * represent directly — `src/utils/role.ts` is the precedent for keeping
 * this kind of client/DB mapping in one place instead of scattering
 * string literals across services and controllers.
 */
export type ClientBookingStatus = "Pending" | "Accepted" | "Rejected" | "In Progress" | "Completed" | "Cancelled";

export type BookingHistoryEntry = {
  status: ClientBookingStatus;
  at: string; // ISO timestamp
  note?: string;
};

const CLIENT_TO_DB: Record<ClientBookingStatus, BookingStatus> = {
  Pending: BookingStatus.PENDING,
  Accepted: BookingStatus.ACCEPTED,
  Rejected: BookingStatus.REJECTED,
  "In Progress": BookingStatus.IN_PROGRESS,
  Completed: BookingStatus.COMPLETED,
  Cancelled: BookingStatus.CANCELLED,
};

const DB_TO_CLIENT: Record<BookingStatus, ClientBookingStatus> = {
  [BookingStatus.PENDING]: "Pending",
  [BookingStatus.ACCEPTED]: "Accepted",
  [BookingStatus.REJECTED]: "Rejected",
  [BookingStatus.IN_PROGRESS]: "In Progress",
  [BookingStatus.COMPLETED]: "Completed",
  [BookingStatus.CANCELLED]: "Cancelled",
};

export function toDbBookingStatus(status: ClientBookingStatus): BookingStatus {
  return CLIENT_TO_DB[status];
}

export function toClientBookingStatus(status: BookingStatus): ClientBookingStatus {
  return DB_TO_CLIENT[status];
}

/**
 * Every allowed forward transition, keyed by the booking's current status —
 * mirrors `NEXT_STATUSES` in the frontend's `src/lib/data.ts` exactly. The
 * frontend enforces this client-side already; this is the real check, since
 * a client is never trusted to self-police its own state transitions.
 */
export const NEXT_STATUSES: Record<ClientBookingStatus, ClientBookingStatus[]> = {
  Pending: ["Accepted", "Rejected"],
  Accepted: ["In Progress", "Cancelled"],
  "In Progress": ["Completed"],
  Completed: [],
  Rejected: [],
  Cancelled: [],
};

/** Mirrors `canCustomerCancel` in the frontend's `src/lib/data.ts`. */
export function canCustomerCancel(status: ClientBookingStatus): boolean {
  return status === "Pending" || status === "Accepted";
}
