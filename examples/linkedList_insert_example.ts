import type { Operation, OpStep } from './types';

// Example: [1,3,4] insert 2 at index 1 (placeholder stub data)
export const linkedListInsertOperations: Operation[] = [
  { kind: 'Create', id: 'LL1', structure: 'LinkedList', payload: [1, 3, 4] },
  { kind: 'Insert', target: 'LL1', pos: 1, value: 2 }
];

export const linkedListInsertSteps: OpStep[] = [];
