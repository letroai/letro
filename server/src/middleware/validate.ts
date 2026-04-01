// server/src/middleware/validate.ts
import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../env.js";
import type { z } from "zod";
import { HTTPException } from "hono/http-exception";

export function validate<T extends z.ZodType>(schema: T) {
  return createMiddleware<AppBindings>(async (c, next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new HTTPException(400, {
        message: "Invalid JSON body",
      });
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));

      return c.json(
        {
          error: "Validation Error",
          details: errors,
        },
        400,
      );
    }

    c.set("validatedBody" as never, result.data as never);
    await next();
  });
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));

      return c.json(
        {
          error: "Query Validation Error",
          details: errors,
        },
        400,
      );
    }

    await next();
  });
}
