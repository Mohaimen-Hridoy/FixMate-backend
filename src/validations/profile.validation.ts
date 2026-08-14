import { z } from "zod";

/**
 * `PATCH /users/me` — mirrors `customerProfileSchema` in the frontend's
 * `src/lib/validation.ts`. `email` is deliberately excluded: changing it
 * would desync the account's login identity from a plain profile edit, so
 * that's out of scope here (same reasoning the frontend form itself never
 * had to confront, since it's demo-only there).
 */
export const updateProfileBodySchema = z.object({
  name: z.string().min(2, "Enter your full name").optional(),
  phone: z
    .string()
    .min(6, "Enter a valid phone number")
    .regex(/^[0-9+\-\s]+$/, "Use digits only")
    .optional(),
  address: z.string().optional(),
});
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

/**
 * `PATCH /provider/profile` — mirrors `providerProfileSchema` (name→businessName,
 * bio) plus the fields `ProviderProfilePage`'s "service areas" chip list and
 * the provider's public profile actually carry (`location`, `serviceAreas`,
 * `responseTime`), so a provider can edit everything their public profile shows.
 */
export const updateProviderProfileBodySchema = z.object({
  businessName: z.string().min(2, "Enter a business name").optional(),
  bio: z.string().min(10, "Bio should be at least 10 characters").optional(),
  location: z.string().min(2, "Location is required").optional(),
  responseTime: z.string().min(2).optional(),
  serviceAreas: z.array(z.string()).optional(),
});
export type UpdateProviderProfileBody = z.infer<typeof updateProviderProfileBodySchema>;

/** `PATCH /users/me/password` — shared by both the customer and provider settings pages. */
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
