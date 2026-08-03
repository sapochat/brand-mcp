/**
 * Object utility functions
 */

const UNSAFE_MERGE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

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
  return deepMergeInternal(target, source, new WeakMap<object, object>()) as T;
}

function deepMergeInternal(target: object, source: object, seen: WeakMap<object, object>): object {
  const cached = seen.get(source);
  if (cached) {
    return cached;
  }

  const result = { ...target };
  seen.set(source, result);

  for (const [key, sourceValue] of Object.entries(source)) {
    if (UNSAFE_MERGE_KEYS.has(key)) {
      continue;
    }

    const targetValue = Object.prototype.hasOwnProperty.call(target, key)
      ? (target as Record<string, unknown>)[key]
      : undefined;

    // Skip null/undefined source values - they won't override existing values
    if (sourceValue === null || sourceValue === undefined) {
      continue;
    }

    // Recursively merge only plain records. Dates, maps, sets, and class
    // instances retain the historical replacement semantics.
    if (isPlainRecord(sourceValue)) {
      const mergeTarget = isPlainRecord(targetValue) ? targetValue : {};

      (result as Record<string, unknown>)[key] = deepMergeInternal(mergeTarget, sourceValue, seen);
    } else {
      // Replace value (including arrays)
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  // Track only the active recursion path. Reusing a source object under two
  // different target branches must still merge each branch independently.
  seen.delete(source);
  return result;
}
