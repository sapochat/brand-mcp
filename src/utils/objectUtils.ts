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

function copySafeTarget(
  target: object,
  seen: WeakMap<object, Record<PropertyKey, unknown>> = new WeakMap()
): Record<PropertyKey, unknown> {
  const cached = seen.get(target);
  if (cached) {
    return cached;
  }

  const result: Record<PropertyKey, unknown> = {};
  seen.set(target, result);

  for (const key of Object.keys(target)) {
    if (UNSAFE_MERGE_KEYS.has(key)) {
      continue;
    }
    const value = (target as Record<string, unknown>)[key];
    result[key] = isPlainRecord(value) ? copySafeTarget(value, seen) : value;
  }

  for (const symbol of Object.getOwnPropertySymbols(target)) {
    if (Object.prototype.propertyIsEnumerable.call(target, symbol)) {
      const value = (target as Record<PropertyKey, unknown>)[symbol];
      result[symbol] = isPlainRecord(value) ? copySafeTarget(value, seen) : value;
    }
  }

  return result;
}

/**
 * Deep merge two objects recursively.
 * Arrays are replaced, not merged.
 * Null/undefined source values are skipped (won't override target values).
 * Prototype-unsafe keys are filtered only on plain-record branches traversed
 * by the merge. Arrays and non-plain values are intentionally opaque so their
 * historical replacement and identity semantics remain intact.
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
  const safeTarget = copySafeTarget(target);
  return mergeSource(safeTarget, source, new WeakMap<object, object>()) as T;
}

function mergeSource(target: object, source: object, seen: WeakMap<object, object>): object {
  const cached = seen.get(source);
  if (cached) {
    return cached;
  }

  const result = target as Record<PropertyKey, unknown>;
  seen.set(source, result);

  for (const key of Object.keys(source)) {
    if (UNSAFE_MERGE_KEYS.has(key)) {
      continue;
    }

    const sourceValue = (source as Record<string, unknown>)[key];

    const targetValue = result[key];

    // Skip null/undefined source values - they won't override existing values
    if (sourceValue === null || sourceValue === undefined) {
      continue;
    }

    // Recursively merge only plain records. Dates, maps, sets, and class
    // instances retain the historical replacement semantics.
    if (isPlainRecord(sourceValue)) {
      const mergeTarget = isPlainRecord(targetValue) ? targetValue : {};

      result[key] = mergeSource(mergeTarget, sourceValue, seen);
    } else {
      // Replace value (including arrays)
      result[key] = sourceValue;
    }
  }

  // Track only the active recursion path. Reusing a source object under two
  // different target branches must still merge each branch independently.
  seen.delete(source);
  return result;
}
