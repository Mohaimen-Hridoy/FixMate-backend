import { Response } from "express";

/**
 * Every successful response follows the same envelope so the frontend
 * (`src/lib/api.ts`) can rely on one shape regardless of endpoint —
 * mirrors the `{ items, total, page, pageSize, totalPages }` pagination
 * contract it already expects for lists.
 */
export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  data: T,
  meta?: Record<string, unknown>,
) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}
