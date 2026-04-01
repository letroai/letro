// server/src/extensions/billing-hook.ts
import type { CostEvent } from "@letro/shared";

export interface BillingHook {
  onCostEvent(event: CostEvent): Promise<void>;
}
