/**
 * Object utility functions
 */

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

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];

    // Skip null/undefined source values - they won't override existing values
    if (sourceValue === null || sourceValue === undefined) {
      continue;
    }

    // Recursively merge nested objects (but not arrays)
    if (
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as object,
        sourceValue as Partial<object>
      );
    } else {
      // Replace value (including arrays)
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}
