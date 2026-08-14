import { Prisma, User } from "@prisma/client";
import { toClientRole } from "@/utils/role";

const userWithProfile = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { providerProfile: true },
});
export type UserWithProfile = Prisma.UserGetPayload<typeof userWithProfile>;

/**
 * The one place a `User` row is allowed to cross into an HTTP response.
 * Drops `passwordHash` and rewrites `role` to the lowercase form the
 * frontend already speaks (`ClientRole`) — see `src/utils/role.ts`.
 */
export function toPublicUser(user: UserWithProfile | User) {
  const { passwordHash: _passwordHash, ...rest } = user;
  void _passwordHash;

  return {
    ...rest,
    role: toClientRole(user.role),
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
