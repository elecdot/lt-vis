import type { OpStep, Operation } from '@ltvis/shared';

export const demoOperations: Operation[] = [
  { kind: 'Create', id: 'DemoList', structure: 'SeqList', payload: [1, 2, 3] },
  { kind: 'Insert', target: 'DemoList', pos: 1, value: 42 }
];

export const demoStep: OpStep = {
  explain: 'Scaffold ready: render and timeline plumbing next.',
  events: [{ type: 'Tip', text: 'Model/renderer wiring will replace this stub.' }],
  snapshot: {
    nodes: [
      { id: 'DemoList:0', label: '1', value: 1, x: 0, y: 0 },
      { id: 'DemoList:1', label: '42', value: 42, x: 1, y: 0 },
      { id: 'DemoList:2', label: '2', value: 2, x: 2, y: 0 },
      { id: 'DemoList:3', label: '3', value: 3, x: 3, y: 0 }
    ],
    edges: [
      { id: 'DemoList:0->DemoList:1:next', src: 'DemoList:0', dst: 'DemoList:1', label: 'next' },
      { id: 'DemoList:1->DemoList:2:next', src: 'DemoList:1', dst: 'DemoList:2', label: 'next' },
      { id: 'DemoList:2->DemoList:3:next', src: 'DemoList:2', dst: 'DemoList:3', label: 'next' }
    ],
    meta: { step: 1, selection: 'DemoList:1' }
  }
};
