import type { Operation, OpStep } from './types';

// Example: build [5,3,7,2,4,6,8] and delete 7 (placeholder stub data)
export const bstDeleteOperations: Operation[] = [
  { kind: 'Create', id: 'BST1', structure: 'BST', payload: [5, 3, 7, 2, 4, 6, 8] },
  { kind: 'Delete', target: 'BST1', key: 7 }
];

export const bstDeleteSteps: OpStep[] = [];
