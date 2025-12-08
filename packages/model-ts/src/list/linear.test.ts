import { describe, expect, it } from 'vitest';
import { LinkedList } from './LinkedList';
import { SeqList } from './SeqList';
import { Stack } from './Stack';

const createList = (list: SeqList | LinkedList, values = [1, 3, 4]) =>
  Array.from(list.apply({ kind: 'Create', id: list.id, structure: list.kind, payload: values }));

describe('SeqList', () => {
  it('inserts with snapshot and events', () => {
    const list = new SeqList('L1');
    createList(list);
    const steps = Array.from(list.apply({ kind: 'Insert', target: 'L1', pos: 1, value: 2 }));
    const finalSnapshot = steps.at(-1)?.snapshot;

    expect(steps.length).toBeGreaterThan(1);
    expect(finalSnapshot?.nodes.map((n) => n.value)).toEqual([1, 2, 3, 4]);
    expect(steps[0].events.length).toBeGreaterThan(0);
    expect(list.snapshot().nodes.map((n) => n.value)).toEqual([1, 2, 3, 4]);
  });

  it('guards invalid delete positions', () => {
    const list = new SeqList('L2');
    createList(list);
    const steps = Array.from(list.apply({ kind: 'Delete', target: 'L2', pos: 99 }));
    expect(steps[0].error?.code).toBe('out_of_bounds');
    expect(list.snapshot().nodes.map((n) => n.value)).toEqual([1, 3, 4]);
  });
});

describe('LinkedList', () => {
  it('delete rewires snapshot', () => {
    const list = new LinkedList('LL1');
    createList(list);
    const steps = Array.from(list.apply({ kind: 'Delete', target: 'LL1', pos: 1 }));
    const finalSnapshot = steps.at(-1)?.snapshot;
    expect(finalSnapshot?.nodes.map((n) => n.value)).toEqual([1, 4]);
    expect(steps.some((s) => s.events.some((e) => e.type === 'RemoveNode'))).toBe(true);
  });
});

describe('Stack', () => {
  it('pushes and pops with snapshots', () => {
    const stack = new Stack('S1');
    Array.from(stack.apply({ kind: 'Create', id: 'S1', structure: 'Stack', payload: [10] }));

    const pushSteps = Array.from(stack.apply({ kind: 'Push', target: 'S1', value: 20 }));
    expect(pushSteps.at(-1)?.snapshot.nodes.map((n) => n.value)).toEqual([10, 20]);
    expect(pushSteps.some((s) => s.events.some((e) => e.type === 'CreateNode'))).toBe(true);

    const popSteps = Array.from(stack.apply({ kind: 'Pop', target: 'S1' }));
    expect(popSteps.at(-1)?.snapshot.nodes.map((n) => n.value)).toEqual([10]);
    expect(popSteps.some((s) => s.events.some((e) => e.type === 'RemoveNode'))).toBe(true);
  });

  it('errors on empty pop', () => {
    const stack = new Stack('S2');
    Array.from(stack.apply({ kind: 'Create', id: 'S2', structure: 'Stack', payload: [] }));
    const steps = Array.from(stack.apply({ kind: 'Pop', target: 'S2' }));
    expect(steps[0].error?.code).toBe('empty_stack');
    expect(stack.snapshot().nodes).toHaveLength(0);
  });
});
