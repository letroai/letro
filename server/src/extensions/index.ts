// server/src/extensions/index.ts
import type { AuthProvider } from "./auth-provider.js";
import type { BillingHook } from "./billing-hook.js";
import type { StorageProvider } from "./storage-provider.js";

export type { AuthProvider, BillingHook, StorageProvider };

export interface ExtensionRegistry {
  auth: AuthProvider;
  billing: BillingHook;
  storage: StorageProvider;
}

export function createDefaultExtensions(): ExtensionRegistry {
  return {
    auth: {
      resolveSession: async () => null,
    },
    billing: {
      onCostEvent: async () => {},
    },
    storage: {
      upload: async (_key: string, _data: Buffer) => "",
      download: async (_key: string) => null,
      delete: async (_key: string) => {},
    },
  };
}
