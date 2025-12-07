import { describe, expect, it } from 'vitest';
import { BinaryTree } from './BinaryTree';

describe('BinaryTree', () => {
  it('traverses with per-step snapshots', () => {
    const tree = new BinaryTree('BT1');
    Array.from(tree.apply({ kind: 'Create', id: 'BT1', structure: 'BinaryTree', payload: [1, 2, 3] }));
    const steps = Array.from(tree.apply({ kind: 'Traverse', target: 'BT1', order: 'preorder' }));
    expect(steps.length).toBeGreaterThan(0);
    steps.forEach((step) => {
      expect(step.snapshot.nodes.length).toBeGreaterThan(0);
      expect(step.events.some((e) => e.type === 'Highlight')).toBe(true);
    });
  });

  it('attaches a new child with snapshot', () => {
    const tree = new BinaryTree('BT2');
    Array.from(tree.apply({ kind: 'Create', id: 'BT2', structure: 'BinaryTree', payload: [1] }));
    const steps = Array.from(tree.apply({ kind: 'Attach', target: 'BT2', parent: 'BT2:0', child: 'BT2:new', side: 'right' }));
    const final = steps.at(-1)?.snapshot;
    expect(final?.edges.some((e) => e.dst === 'BT2:new' && e.label === 'R')).toBe(true);
  });

  it('resetFromSnapshot restores state', () => {
    const tree = new BinaryTree('BT3');
    Array.from(tree.apply({ kind: 'Create', id: 'BT3', structure: 'BinaryTree', payload: [1, 2, 3] }));
    const snap = tree.snapshot();
    tree.reset();
    tree.resetFromSnapshot(snap);
    expect(tree.snapshot().nodes.map((n) => n.id).sort()).toEqual(snap.nodes.map((n) => n.id).sort());
  });
});
