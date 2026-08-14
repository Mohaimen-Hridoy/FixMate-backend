import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError } from "@/utils/ApiError";
import { logger } from "@/config/logger";
import { isProd } from "@/config/env";

/** 404 fallback — must be mounted after all routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Single place that turns any thrown/rejected error into a consistent
 * JSON shape: known ApiErrors pass their status+message through, Zod and
 * Prisma errors get translated, and everything else becomes an opaque
 * 500 (with the real message logged, not leaked to the client in prod).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  let statusCode = 500;
  let message = "Internal server error";
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    details = err.flatten().fieldErrors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      message = `A record with this ${(err.meta?.target as string[])?.join(", ") ?? "value"} already exists`;
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "Record not found";
    } else {
      statusCode = 400;
      message = "Database request error";
    }
  } else if (err instanceof Error) {
    message = isProd ? message : err.message;
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}`, err);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} → ${statusCode}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(!isProd && err instanceof Error ? { stack: err.stack } : {}),
  });
}
