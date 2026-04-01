// server/src/env.ts
import type { Database } from "@letro/db/client";
import type { Config } from "./config.js";
import type { Logger } from "pino";
import type { ServiceContainer } from "./services/index.js";

export interface AppBindings {
  Variables: {
    db: Database;
    config: Config;
    logger: Logger;
    services: ServiceContainer;
    actor: Actor;
    requestStartTime: number;
  };
}

export type Actor =
  | { kind: "local_trusted"; companyId: string | null }
  | { kind: "user"; userId: string; companyId: string | null }
  | { kind: "agent"; agentId: string; companyId: string }
  | { kind: "anonymous" };
