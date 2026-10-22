import type { ErrorHandler } from "hono";
import { logger } from "../../infrastructure/logger/index.js";
import { AppError } from "../../shared/errors/index.js";

/** Batas error global: AppError → statusnya; sisanya 500 generik tanpa stack. */
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.statusCode as never);
  }
  logger.error("unhandled error", { message: err instanceof Error ? err.message : String(err) });
  return c.json({ error: "Terjadi kesalahan internal", code: "internal_error" }, 500);
};
