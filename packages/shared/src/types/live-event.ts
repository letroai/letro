// packages/shared/src/types/live-event.ts
import type { LiveEventType } from "../constants.js";

export interface LiveEvent {
  type: LiveEventType;
  companyId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}
