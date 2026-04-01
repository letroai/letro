// server/src/middleware/error-handler.ts
import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { AppBindings } from "../env.js";

export const errorHandler: ErrorHandler<AppBindings> = (err, c) => {
  const logger = c.get("logger");

  if (err instanceof HTTPException) {
    logger.warn({ status: err.status, message: err.message }, "HTTP exception");
    return c.json(
      {
        error: "HTTPException",
        message: err.message,
      },
      err.status,
    );
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    logger.warn({ details }, "Validation error");
    return c.json(
      {
        error: "ValidationError",
        message: "Request validation failed",
        details,
      },
      400,
    );
  }

  const config = c.get("config");
  logger.error({ err }, "Unhandled error");

  return c.json(
    {
      error: "InternalServerError",
      message:
        config.nodeEnv === "development"
          ? (err as Error).message
          : "An unexpected error occurred",
      ...(config.nodeEnv === "development" && {
        stack: (err as Error).stack,
      }),
    },
    500,
  );
};
