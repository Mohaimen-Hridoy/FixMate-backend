import { z } from "zod";

/**
 * Mirrors `serviceSchema` in the Phase 10 frontend's `src/lib/validation.ts`
 * exactly (same field names, same limits), plus `features` — the frontend
 * type carries `features: string[]` on every `Service` but the create/edit
 * form doesn't collect it yet, so it's optional here and defaults to `[]`.
 */
export const serviceBodySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().min(1, "Choose a category"),
  shortDescription: z
    .string()
    .min(10, "Short description must be at least 10 characters")
    .max(120, "Keep it under 120 characters"),
  description: z.string().optional().default(""),
  price: z.coerce.number({ invalid_type_error: "Enter a valid price" }).positive("Price must be greater than 0"),
  priceUnit: z.enum(["job", "hour", "visit"]).default("job"),
  location: z.string().min(2, "Location is required"),
  available: z.boolean().default(true),
  features: z.array(z.string()).optional().default([]),
});
export type ServiceBody = z.infer<typeof serviceBodySchema>;

/** PATCH /services/mine/:id — every field optional, same per-field rules when present. */
export const serviceUpdateBodySchema = serviceBodySchema.partial();
export type ServiceUpdateBody = z.infer<typeof serviceUpdateBodySchema>;

/**
 * Mirrors `ServiceQuery` in the frontend's `src/lib/api.ts` — same keys,
 * same defaults applied downstream in `service.service.ts`'s `queryServices`,
 * so `GET /services?...` accepts exactly the params `fetchServices` already
 * builds. Query-string values arrive as strings, hence `z.coerce` on the
 * numeric fields.
 */
export const serviceQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  providerId: z.string().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(["recommended", "price-asc", "price-desc", "rating", "newest"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});
export type ServiceQuery = z.infer<typeof serviceQuerySchema>;
