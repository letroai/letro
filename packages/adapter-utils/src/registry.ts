import type { ServerAdapterModule } from "./types.js";

/**
 * Adapter registry.
 *
 * Stores/retrieves adapters by id.
 * After registering default adapters, external adapters can be added.
 */
export class AdapterRegistry {
  private readonly adapters = new Map<string, ServerAdapterModule>();

  /** Registers an adapter. Overwrites if same id exists. */
  register(adapter: ServerAdapterModule): void {
    this.adapters.set(adapter.id, adapter);
  }

  /** Gets an adapter by id. Returns undefined if not found. */
  get(id: string): ServerAdapterModule | undefined {
    return this.adapters.get(id);
  }

  /** Returns a list of all registered adapters. */
  list(): ServerAdapterModule[] {
    return Array.from(this.adapters.values());
  }

  /** Checks if an adapter is registered and available. */
  async isAvailable(id: string): Promise<boolean> {
    const adapter = this.adapters.get(id);
    if (!adapter) return false;
    return adapter.isAvailable();
  }
}
