import { describe, expect, it } from 'vitest';
import { BST } from './BST';

describe('BST', () => {
  it('creates and inserts maintaining order', () => {
    const bst = new BST('BST1');
    Array.from(bst.apply({ kind: 'Create', id: 'BST1', structure: 'BST', payload: [5, 3, 7] }));
    const insertSteps = Array.from(bst.apply({ kind: 'Insert', target: 'BST1', value: 4 }));
    expect(insertSteps.at(-1)?.snapshot.nodes.map((n) => n.value).sort()).toEqual([3, 4, 5, 7]);
  });

  it('deletes node with two children (example case)', () => {
    const bst = new BST('BST1');
    Array.from(bst.apply({ kind: 'Create', id: 'BST1', structure: 'BST', payload: [5, 3, 7, 2, 4, 6, 8] }));
    const deleteSteps = Array.from(bst.apply({ kind: 'Delete', target: 'BST1', key: 7 }));
    const final = deleteSteps.at(-1)?.snapshot;
    expect(final?.nodes.map((n) => n.value).sort()).toEqual([2, 3, 4, 5, 6, 8]);
    expect(final?.nodes.length).toBe(6);
  });
});
