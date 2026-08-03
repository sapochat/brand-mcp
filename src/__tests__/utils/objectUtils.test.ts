import { describe, it, expect } from '@jest/globals';
import { deepMerge } from '../../utils/objectUtils.js';

describe('objectUtils', () => {
  describe('deepMerge', () => {
    it('deeply merges plain objects and replaces arrays', () => {
      type MergeTarget = {
        nested: { keep?: boolean; replace: string };
        items: string[];
      };

      const result = deepMerge<MergeTarget>(
        {
          nested: { keep: true, replace: 'old' },
          items: ['old'],
        },
        {
          nested: { replace: 'new' },
          items: ['new'],
        }
      );

      expect(result).toEqual({
        nested: { keep: true, replace: 'new' },
        items: ['new'],
      });
    });

    it('ignores unsafe prototype pollution keys from parsed JSON', () => {
      const source = JSON.parse(
        [
          '{"__proto__":{"polluted":true},',
          '"constructor":{"prototype":{"polluted":true}},',
          '"prototype":{"polluted":true},',
          '"safe":true}',
        ].join('')
      ) as Partial<{ safe: boolean }>;

      const result = deepMerge<{ safe?: boolean }>({}, source);

      expect(result).toEqual({ safe: true });
      expect((result as Record<string, unknown>).polluted).toBeUndefined();
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(Object.prototype).not.toHaveProperty('polluted');
    });

    it.each(['__proto__', 'constructor', 'prototype'])(
      'removes nested unsafe key %s when the target branch exists',
      (unsafeKey) => {
        const source = JSON.parse(
          `{"nested":{"safe":true,"${unsafeKey}":{"polluted":true}}}`
        ) as Partial<{ nested: { safe?: boolean } }>;

        const result = deepMerge({ nested: {} }, source);

        expect(result).toEqual({ nested: { safe: true } });
        expect(Object.prototype).not.toHaveProperty('polluted');
      }
    );

    it.each(['__proto__', 'constructor', 'prototype'])(
      'removes nested unsafe key %s when creating a target branch',
      (unsafeKey) => {
        const source = JSON.parse(
          `{"nested":{"safe":true,"${unsafeKey}":{"polluted":true}}}`
        ) as Partial<{ nested: { safe?: boolean } }>;

        const result = deepMerge<{
          nested?: { safe?: boolean };
        }>({}, source);

        expect(result).toEqual({ nested: { safe: true } });
        expect(Object.prototype).not.toHaveProperty('polluted');
      }
    );

    it.each(['__proto__', 'constructor', 'prototype'])(
      'rejects unsafe key %s before evaluating its getter',
      (unsafeKey) => {
        let getterCalls = 0;
        const source = Object.defineProperty({}, unsafeKey, {
          enumerable: true,
          get: () => {
            getterCalls += 1;
            throw new Error('unsafe getter must not run');
          },
        });

        expect(() => deepMerge({}, source)).not.toThrow();
        expect(getterCalls).toBe(0);
      }
    );

    it('does not merge inherited enumerable properties from source prototypes', () => {
      const sourcePrototype = { inherited: true };
      const source = Object.create(sourcePrototype) as Partial<{ own?: boolean }>;
      source.own = true;

      const result = deepMerge<{ own?: boolean }>({}, source);

      expect(result).toEqual({ own: true });
    });

    it('does not read or merge inherited target properties', () => {
      const targetPrototype = Object.create(null, {
        nested: {
          enumerable: true,
          get: () => {
            throw new Error('inherited target getter must not run');
          },
        },
      });
      const target = Object.create(targetPrototype) as { nested?: { safe?: boolean } };

      const result = deepMerge(target, { nested: { safe: true } });

      expect(result).toEqual({ nested: { safe: true } });
    });

    it.each(['__proto__', 'constructor', 'prototype'])(
      'rejects unsafe target key %s before evaluating root and nested getters',
      (unsafeKey) => {
        let getterCalls = 0;
        const unsafeGetter = {
          enumerable: true,
          get: () => {
            getterCalls += 1;
            throw new Error('unsafe target getter must not run');
          },
        };
        const nested = Object.defineProperty(
          { keep: true } as { keep?: boolean; added?: boolean },
          unsafeKey,
          unsafeGetter
        );
        const target = Object.defineProperty({ nested }, unsafeKey, unsafeGetter);

        const result = deepMerge(target, { nested: { added: true } });

        expect(getterCalls).toBe(0);
        expect(Object.prototype.hasOwnProperty.call(result, unsafeKey)).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(result.nested, unsafeKey)).toBe(false);
        expect(result).toEqual({ nested: { keep: true, added: true } });
      }
    );

    it('removes parsed target __proto__ data before downstream assignment', () => {
      const target = JSON.parse('{"__proto__":{"polluted":true},"safe":true}');
      const result = deepMerge(target, {});
      const assigned = Object.assign({}, result);

      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
      expect(Object.getPrototypeOf(assigned)).toBe(Object.prototype);
      expect((assigned as { polluted?: boolean }).polluted).toBeUndefined();
    });

    it('replaces non-plain values instead of converting them to plain objects', () => {
      class Marker {
        constructor(readonly value: string) {}
      }

      const date = new Date('2026-08-03T00:00:00.000Z');
      const marker = new Marker('source');
      const result = deepMerge(
        { date: new Date('2020-01-01T00:00:00.000Z'), marker: new Marker('target') },
        { date, marker }
      );

      expect(result.date).toBe(date);
      expect(result.marker).toBe(marker);
      expect(result.marker).toBeInstanceOf(Marker);
    });

    it('sanitizes a plain source record when it replaces a primitive target', () => {
      const source = JSON.parse(
        '{"nested":{"safe":true,"constructor":{"prototype":{"polluted":true}}}}'
      ) as Partial<{ nested: unknown }>;

      const result = deepMerge<{ nested: unknown }>({ nested: 'old' }, source);

      expect(result).toEqual({ nested: { safe: true } });
      expect(Object.prototype).not.toHaveProperty('polluted');
    });

    it('handles cyclic plain records without overflowing the stack', () => {
      type Cyclic = { safe?: boolean; self?: Cyclic };
      const source: Cyclic = { safe: true };
      source.self = source;

      const result = deepMerge<Cyclic>({}, source);

      expect(result.safe).toBe(true);
      expect(result.self).toBe(result);
    });

    it('merges shared source records independently into distinct targets', () => {
      type Branch = { keepFirst?: boolean; keepSecond?: boolean; added?: boolean };
      const shared: Branch = { added: true };
      const result = deepMerge(
        {
          first: { keepFirst: true } as Branch,
          second: { keepSecond: true } as Branch,
        },
        { first: shared, second: shared }
      );

      expect(result).toEqual({
        first: { keepFirst: true, added: true },
        second: { keepSecond: true, added: true },
      });
      expect(result.first).not.toBe(result.second);
    });
  });
});
