import { Role } from "@prisma/client";

/**
 * The frontend only ever deals with lowercase role strings — see
 * `dashboardByRole` in `src/app/login/page.tsx` (`customer` | `provider` |
 * `admin`) — while Prisma's `Role` enum is uppercase by convention. These
 * two helpers are the single place that crosses that boundary, so a typo
 * can't silently desync the API contract from the DB schema.
 */
export type ClientRole = "customer" | "provider" | "admin";

const CLIENT_TO_DB: Record<ClientRole, Role> = {
  customer: Role.CUSTOMER,
  provider: Role.PROVIDER,
  admin: Role.ADMIN,
};

const DB_TO_CLIENT: Record<Role, ClientRole> = {
  [Role.CUSTOMER]: "customer",
  [Role.PROVIDER]: "provider",
  [Role.ADMIN]: "admin",
};

export function toDbRole(role: ClientRole): Role {
  return CLIENT_TO_DB[role];
}

export function toClientRole(role: Role): ClientRole {
  return DB_TO_CLIENT[role];
}
