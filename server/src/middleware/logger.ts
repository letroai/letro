// server/src/middleware/logger.ts
import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../env.js";

export function loggerMiddleware() {
  return createMiddleware<AppBindings>(async (c, next) => {
    const startTime = c.get("requestStartTime");
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const duration = Date.now() - startTime;
    const status = c.res.status;
    const logger = c.get("logger");

    const logData = {
      method,
      path,
      status,
      duration: `${duration}ms`,
    };

    if (status >= 500) {
      logger.error(logData, "Request completed with server error");
    } else if (status >= 400) {
      logger.warn(logData, "Request completed with client error");
    } else {
      logger.info(logData, "Request completed");
    }
  });
}
