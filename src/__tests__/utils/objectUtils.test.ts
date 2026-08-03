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

    it('does not merge inherited enumerable properties from source prototypes', () => {
      const sourcePrototype = { inherited: true };
      const source = Object.create(sourcePrototype) as Partial<{ own?: boolean }>;
      source.own = true;

      const result = deepMerge<{ own?: boolean }>({}, source);

      expect(result).toEqual({ own: true });
    });
  });
});
