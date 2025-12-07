import { describe, expect, it } from 'vitest';
import { bstDeleteOperations, bstDeleteSteps } from '../bst_delete_example';
import { linkedListInsertOperations, linkedListInsertSteps } from '../linkedList_insert_example';

describe('linked list insert example', () => {
  it('has operations and snapshots for each step', () => {
    expect(linkedListInsertOperations).toHaveLength(2);
    expect(linkedListInsertSteps.length).toBeGreaterThan(0);
    linkedListInsertSteps.forEach((step) => {
      expect(step.snapshot.nodes.length).toBeGreaterThan(0);
      expect(step.snapshot.edges.length).toBeGreaterThan(0);
    });
  });

  it('ends with [1,2,3,4]', () => {
    const final = linkedListInsertSteps[linkedListInsertSteps.length - 1];
    const values = final.snapshot.nodes.map((n) => n.value);
    expect(values).toEqual([1, 2, 3, 4]);
    expect(final.snapshot.meta?.selection).toBe('LL1:ins');
  });
});

describe('bst delete example', () => {
  it('has operations and snapshots for each step', () => {
    expect(bstDeleteOperations).toHaveLength(2);
    expect(bstDeleteSteps.length).toBeGreaterThan(0);
    bstDeleteSteps.forEach((step) => {
      expect(step.snapshot.nodes.length).toBeGreaterThan(0);
      expect(step.snapshot.edges.length).toBeGreaterThan(0);
    });
  });

  it('removes node 7 and preserves BST ordering', () => {
    const final = bstDeleteSteps[bstDeleteSteps.length - 1];
    const values = final.snapshot.nodes.map((n) => n.value);
    expect(values).toEqual([5, 3, 2, 4, 8, 6]);
    const edgeIds = final.snapshot.edges.map((e) => e.id);
    expect(edgeIds).toContain('BST1:e5-8');
    expect(edgeIds).not.toContain('BST1:e5-7');
  });
});
