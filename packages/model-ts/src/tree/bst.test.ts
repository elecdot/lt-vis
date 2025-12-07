import { describe, expect, it } from 'vitest';
import { BST } from './BST';

describe('BST', () => {
  it('creates and inserts maintaining order', () => {
    const bst = new BST('BST1');
    Array.from(bst.apply({ kind: 'Create', id: 'BST1', structure: 'BST', payload: [5, 3, 7] }));
    const insertSteps = Array.from(bst.apply({ kind: 'Insert', target: 'BST1', value: 4 }));
    expect(insertSteps.at(-1)?.snapshot.nodes.map((n) => n.value).sort()).toEqual([3, 4, 5, 7]);
  });

  it('find returns per-step snapshots', () => {
    const bst = new BST('BST2');
    Array.from(bst.apply({ kind: 'Create', id: 'BST2', structure: 'BST', payload: [5, 3, 7] }));
    const steps = Array.from(bst.apply({ kind: 'Find', target: 'BST2', key: 7 }));
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeGreaterThan(1);
    steps.forEach((s) => expect(s.snapshot.nodes.length).toBeGreaterThan(0));
  });

  it('traverses inorder with step snapshots', () => {
    const bst = new BST('BST3');
    Array.from(bst.apply({ kind: 'Create', id: 'BST3', structure: 'BST', payload: [5, 3, 7] }));
    const steps = Array.from(bst.apply({ kind: 'Traverse', target: 'BST3', order: 'inorder' }));
    expect(steps.length).toBe(3);
    expect(steps[0].events.some((e) => e.type === 'Highlight')).toBe(true);
  });

  it('deletes node with two children (example case)', () => {
    const bst = new BST('BST1');
    Array.from(bst.apply({ kind: 'Create', id: 'BST1', structure: 'BST', payload: [5, 3, 7, 2, 4, 6, 8] }));
    const deleteSteps = Array.from(bst.apply({ kind: 'Delete', target: 'BST1', key: 7 }));
    const final = deleteSteps.at(-1)?.snapshot;
    expect(final?.nodes.map((n) => n.value).sort()).toEqual([2, 3, 4, 5, 6, 8]);
    expect(final?.nodes.length).toBe(6);
  });

  it('resetFromSnapshot round-trip', () => {
    const bst = new BST('BST4');
    Array.from(bst.apply({ kind: 'Create', id: 'BST4', structure: 'BST', payload: [2, 1, 3] }));
    const snap = bst.snapshot();
    bst.reset();
    bst.resetFromSnapshot(snap);
    expect(bst.snapshot().nodes.length).toBe(3);
  });

  it('errors on duplicate insert and missing delete key', () => {
    const bst = new BST('BST5');
    Array.from(bst.apply({ kind: 'Create', id: 'BST5', structure: 'BST', payload: [2, 1, 3] }));
    const dup = Array.from(bst.apply({ kind: 'Insert', target: 'BST5', value: 2 }));
    expect(dup[0].error?.code).toBe('duplicate');
    const del = Array.from(bst.apply({ kind: 'Delete', target: 'BST5', key: 999 }));
    expect(del[0].error?.code).toBe('not_found');
    expect(del[0].snapshot.nodes.length).toBeGreaterThan(0);
  });

  it('traverses all orders with per-step snapshots', () => {
    const bst = new BST('BST6');
    Array.from(bst.apply({ kind: 'Create', id: 'BST6', structure: 'BST', payload: [5, 3, 7] }));
    (['preorder', 'inorder', 'postorder', 'levelorder'] as const).forEach((order) => {
      const steps = Array.from(bst.apply({ kind: 'Traverse', target: 'BST6', order }));
      expect(steps.length).toBe(3);
      steps.forEach((s) => expect(s.snapshot.nodes.length).toBe(3));
    });
  });
});
