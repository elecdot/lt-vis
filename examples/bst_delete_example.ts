import type { Operation, OpStep, StateSnapshot } from './types';

// Example: build [5,3,7,2,4,6,8] and delete 7
export const bstDeleteOperations: Operation[] = [
  { kind: 'Create', id: 'BST1', structure: 'BST', payload: [5, 3, 7, 2, 4, 6, 8] },
  { kind: 'Delete', target: 'BST1', key: 7 }
];

const bstInitialSnapshot: StateSnapshot = {
  nodes: [
    { id: 'BST1:5', label: '5', value: 5 },
    { id: 'BST1:3', label: '3', value: 3 },
    { id: 'BST1:7', label: '7', value: 7 },
    { id: 'BST1:2', label: '2', value: 2 },
    { id: 'BST1:4', label: '4', value: 4 },
    { id: 'BST1:6', label: '6', value: 6 },
    { id: 'BST1:8', label: '8', value: 8 }
  ],
  edges: [
    { id: 'BST1:e5-3', src: 'BST1:5', dst: 'BST1:3', label: 'L' },
    { id: 'BST1:e5-7', src: 'BST1:5', dst: 'BST1:7', label: 'R' },
    { id: 'BST1:e3-2', src: 'BST1:3', dst: 'BST1:2', label: 'L' },
    { id: 'BST1:e3-4', src: 'BST1:3', dst: 'BST1:4', label: 'R' },
    { id: 'BST1:e7-6', src: 'BST1:7', dst: 'BST1:6', label: 'L' },
    { id: 'BST1:e7-8', src: 'BST1:7', dst: 'BST1:8', label: 'R' }
  ],
  meta: { step: 0, selection: 'BST1:5' }
};

const bstAfterDeleteSnapshot: StateSnapshot = {
  nodes: [
    { id: 'BST1:5', label: '5', value: 5 },
    { id: 'BST1:3', label: '3', value: 3 },
    { id: 'BST1:2', label: '2', value: 2 },
    { id: 'BST1:4', label: '4', value: 4 },
    { id: 'BST1:8', label: '8', value: 8 },
    { id: 'BST1:6', label: '6', value: 6 }
  ],
  edges: [
    { id: 'BST1:e5-3', src: 'BST1:5', dst: 'BST1:3', label: 'L' },
    { id: 'BST1:e5-8', src: 'BST1:5', dst: 'BST1:8', label: 'R' },
    { id: 'BST1:e3-2', src: 'BST1:3', dst: 'BST1:2', label: 'L' },
    { id: 'BST1:e3-4', src: 'BST1:3', dst: 'BST1:4', label: 'R' },
    { id: 'BST1:e8-6', src: 'BST1:8', dst: 'BST1:6', label: 'L' }
  ],
  meta: { step: 2, selection: 'BST1:8' }
};

export const bstDeleteSteps: OpStep[] = [
  {
    explain: 'Search for key 7 starting at the root.',
    events: [
      { type: 'Compare', a: 'BST1:5', b: 'BST1:7' },
      { type: 'Highlight', target: { kind: 'node', id: 'BST1:7' }, style: 'found' },
      { type: 'Tip', text: 'Key 7 is greater than 5, move right', anchor: 'BST1:7' }
    ],
    snapshot: bstInitialSnapshot
  },
  {
    explain: 'Node 7 has two children; select inorder successor 8.',
    events: [
      { type: 'Highlight', target: { kind: 'node', id: 'BST1:7' }, style: 'focus' },
      { type: 'Highlight', target: { kind: 'node', id: 'BST1:8' }, style: 'successor' },
      { type: 'Compare', a: 'BST1:7', b: 'BST1:8' },
      { type: 'Tip', text: 'Promote successor 8 to replace 7', anchor: 'BST1:8' }
    ],
    snapshot: bstInitialSnapshot
  },
  {
    explain: 'Rewire parent and children, remove node 7.',
    events: [
      { type: 'Unlink', id: 'BST1:e5-7', src: 'BST1:5', dst: 'BST1:7' },
      { type: 'Unlink', id: 'BST1:e7-8', src: 'BST1:7', dst: 'BST1:8' },
      { type: 'Unlink', id: 'BST1:e7-6', src: 'BST1:7', dst: 'BST1:6' },
      { type: 'RemoveNode', id: 'BST1:7' },
      { type: 'Link', edge: { id: 'BST1:e5-8', src: 'BST1:5', dst: 'BST1:8', label: 'R' } },
      { type: 'Link', edge: { id: 'BST1:e8-6', src: 'BST1:8', dst: 'BST1:6', label: 'L' } },
      { type: 'Tip', text: '8 replaces 7; 6 becomes left child of 8', anchor: 'BST1:8' }
    ],
    snapshot: bstAfterDeleteSnapshot
  }
];
