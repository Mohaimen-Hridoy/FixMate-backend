import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import { comparePassword, hashPassword } from "@/utils/password";
import { toPublicUser, type UserWithProfile } from "@/utils/sanitize";
import type { ChangePasswordBody, UpdateProfileBody } from "@/validations/profile.validation";

/** `PATCH /users/me` — the customer/provider dashboard's Profile form (name/phone/address only). */
export async function updateMe(userId: string, input: UpdateProfileBody) {
  const data: { name?: string; phone?: string; address?: string } = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.address !== undefined) data.address = input.address;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: { providerProfile: true },
  });
  return toPublicUser(user as UserWithProfile);
}

/** `PATCH /users/me/password` — shared by the customer and provider Settings pages. */
export async function changePassword(userId: string, input: ChangePasswordBody): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");

  const matches = await comparePassword(input.currentPassword, user.passwordHash);
  if (!matches) throw ApiError.badRequest("Current password is incorrect");

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
