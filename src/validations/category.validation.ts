import { z } from "zod";

/**
 * Mirrors the admin dashboard's category form (`src/app/dashboard/admin/categories/page.tsx`)
 * — just a name + emoji icon. `slug` is derived server-side from `name`
 * via `slugify` (see category.service.ts) rather than taken from the
 * client, same reasoning as Service's slug.
 */
export const categoryBodySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(40, "Keep it under 40 characters"),
  icon: z.string().min(1, "Pick an icon").max(8, "Icon should be a single emoji"),
});
export type CategoryBody = z.infer<typeof categoryBodySchema>;

/** PATCH /categories/:id — every field optional. */
export const categoryUpdateBodySchema = categoryBodySchema.partial();
export type CategoryUpdateBody = z.infer<typeof categoryUpdateBodySchema>;
