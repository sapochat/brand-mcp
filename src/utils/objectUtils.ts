/**
 * Object utility functions
 */

const UNSAFE_MERGE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deep merge two objects recursively.
 * Arrays are replaced, not merged.
 * Null/undefined source values are skipped (won't override target values).
 *
 * @example
 * deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 }) // { a: 1, b: 3, c: 4 }
 * deepMerge({ a: 1 }, { a: null }) // { a: 1 } - null skipped
 * deepMerge({ a: { b: 1 } }, { a: { c: 2 } }) // { a: { b: 1, c: 2 } }
 *
 * @param target - The base object to merge into
 * @param source - The object with values to merge
 * @returns A new object with merged values
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;

  for (const [key, sourceValue] of Object.entries(source)) {
    if (UNSAFE_MERGE_KEYS.has(key)) {
      continue;
    }

    const targetValue = (target as Record<string, unknown>)[key];

    // Skip null/undefined source values - they won't override existing values
    if (sourceValue === null || sourceValue === undefined) {
      continue;
    }

    // Recursively merge nested objects (but not arrays)
    if (typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      const mergeTarget =
        typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)
          ? targetValue
          : {};

      (result as Record<string, unknown>)[key] = deepMerge(
        mergeTarget as object,
        sourceValue as Partial<object>
      );
    } else {
      // Replace value (including arrays)
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}
