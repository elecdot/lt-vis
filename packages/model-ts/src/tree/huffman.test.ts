import { describe, expect, it } from 'vitest';
import { HuffmanTree } from './HuffmanTree';

describe('HuffmanTree', () => {
  it('builds a tree with correct node count and total weight', () => {
    const weights = { a: 5, b: 9, c: 12, d: 13, e: 16, f: 45 };
    const h = new HuffmanTree('H1');
    const steps = Array.from(h.apply({ kind: 'BuildHuffman', target: 'H1', weights }));
    const final = steps.at(-1)?.snapshot;
    expect(final?.nodes.length).toBe(2 * Object.keys(weights).length - 1);
    const totalWeight = final?.nodes.find((n) => n.id === final.meta?.selection)?.value ?? 0;
    expect(totalWeight).toBe(100);
  });

  it('errors on empty weights', () => {
    const h = new HuffmanTree('H2');
    const steps = Array.from(h.apply({ kind: 'BuildHuffman', target: 'H2', weights: {} }));
    expect(steps[0].error?.code).toBe('invalid_payload');
  });
});
