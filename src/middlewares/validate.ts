import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

/**
 * Parses+replaces `req.body` with the schema's output (so defaults like
 * `role: "customer"` are actually applied downstream). Thrown ZodErrors
 * are forwarded to `next()` and formatted by the global error handler,
 * which already has a dedicated ZodError branch — see
 * `src/middlewares/errorHandler.ts`.
 */
export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };

/**
 * Same idea as `validate`, but for `req.query` (e.g. `GET /services`'s
 * search/filter/sort/paginate params). Express's `Request.query` is typed
 * as `ParsedQs`, so the coerced/defaulted output is cast back onto it —
 * downstream handlers read it through the schema's inferred type instead.
 */
export const validateQuery =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (err) {
      next(err);
    }
  };
