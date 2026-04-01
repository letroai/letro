// server/src/lib/strip-undefined.ts

/**
 * Strips keys with undefined values from an object
 * and removes undefined from the result type.
 * Used for exactOptionalPropertyTypes compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stripUndefined<T extends Record<string, any>>(obj: T): {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
} {
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result as any;
}

export { stripUndefined as omitUndefined };
