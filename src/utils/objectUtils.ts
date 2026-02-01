/**
 * Object utility functions
 */

/**
 * Deep merge two objects recursively.
 * Arrays are replaced, not merged.
 * Null/undefined source values are skipped.
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

    if (sourceValue === null || sourceValue === undefined) {
      continue;
    }

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as object,
        sourceValue as Partial<object>
      );
    } else {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}
