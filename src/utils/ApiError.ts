/**
 * Thrown deliberately by route handlers/services for expected failure
 * cases (validation, not found, unauthorized, etc). The global error
 * handler distinguishes these "operational" errors — safe to show the
 * client — from unexpected bugs, which get a generic 500 instead.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }
  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }
  static tooMany(message = "Too many requests, please try again later") {
    return new ApiError(429, message);
  }
  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}
