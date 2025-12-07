import type { Operation, OpStep, StateSnapshot } from './types';

// Example: [1,3,4] insert 2 at index 1
export const linkedListInsertOperations: Operation[] = [
  { kind: 'Create', id: 'LL1', structure: 'LinkedList', payload: [1, 3, 4] },
  { kind: 'Insert', target: 'LL1', pos: 1, value: 2 }
];

const linkedListInitialSnapshot: StateSnapshot = {
  nodes: [
    { id: 'LL1:0', label: '1', value: 1 },
    { id: 'LL1:1', label: '3', value: 3 },
    { id: 'LL1:2', label: '4', value: 4 }
  ],
  edges: [
    { id: 'LL1:e0', src: 'LL1:0', dst: 'LL1:1', label: 'next' },
    { id: 'LL1:e1', src: 'LL1:1', dst: 'LL1:2', label: 'next' }
  ],
  meta: { step: 0, selection: 'LL1:1' }
};

const linkedListAfterInsertSnapshot: StateSnapshot = {
  nodes: [
    { id: 'LL1:0', label: '1', value: 1 },
    { id: 'LL1:ins', label: '2', value: 2 },
    { id: 'LL1:1', label: '3', value: 3 },
    { id: 'LL1:2', label: '4', value: 4 }
  ],
  edges: [
    { id: 'LL1:e0a', src: 'LL1:0', dst: 'LL1:ins', label: 'next' },
    { id: 'LL1:e0b', src: 'LL1:ins', dst: 'LL1:1', label: 'next' },
    { id: 'LL1:e1', src: 'LL1:1', dst: 'LL1:2', label: 'next' }
  ],
  meta: { step: 1, selection: 'LL1:ins' }
};

export const linkedListInsertSteps: OpStep[] = [
  {
    explain: 'Traverse to index 1 (after the first node).',
    events: [
      { type: 'Highlight', target: { kind: 'node', id: 'LL1:1' }, style: 'target' },
      { type: 'Tip', text: 'Position found: insert before node with value 3', anchor: 'LL1:1' }
    ],
    snapshot: linkedListInitialSnapshot
  },
  {
    explain: 'Insert value 2 and reconnect neighbors.',
    events: [
      { type: 'CreateNode', node: { id: 'LL1:ins', label: '2', value: 2 } },
      { type: 'Unlink', id: 'LL1:e0', src: 'LL1:0', dst: 'LL1:1' },
      { type: 'Link', edge: { id: 'LL1:e0a', src: 'LL1:0', dst: 'LL1:ins', label: 'next' } },
      { type: 'Link', edge: { id: 'LL1:e0b', src: 'LL1:ins', dst: 'LL1:1', label: 'next' } },
      { type: 'Tip', text: 'Inserted 2 between 1 and 3', anchor: 'LL1:ins' }
    ],
    snapshot: linkedListAfterInsertSnapshot
  }
];
