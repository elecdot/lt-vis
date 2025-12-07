import type { OpStep } from '@ltvis/shared';
import { layoutLinear, layoutTree } from './layout';
import { createRenderer } from './engine';
import type { ViewState } from './types';

// Sample linked list insert steps for smoke rendering
const linkedListDemo: OpStep[] = [
  {
    explain: 'Highlight insert position',
    events: [{ type: 'CreateNode', node: { id: 'L:0', label: '1' } }],
    snapshot: { nodes: [{ id: 'L:0', label: '1', x: 0, y: 0 }], edges: [] }
  },
  {
    explain: 'Insert 2 and rewire',
    events: [
      { type: 'CreateNode', node: { id: 'L:ins', label: '2' } },
      { type: 'Link', edge: { id: 'L:0->L:ins:next', src: 'L:0', dst: 'L:ins', label: 'next' } }
    ],
    snapshot: { nodes: [{ id: 'L:0', label: '1' }, { id: 'L:ins', label: '2' }], edges: [{ id: 'L:0->L:ins:next', src: 'L:0', dst: 'L:ins', label: 'next' }] }
  }
];

// Sample tree traverse steps
const treeDemo: OpStep[] = [
  {
    explain: 'Visit root',
    events: [{ type: 'CreateNode', node: { id: 'T:root', label: '5' } }],
    snapshot: { nodes: [{ id: 'T:root', label: '5' }], edges: [] }
  },
  {
    explain: 'Visit left',
    events: [{ type: 'CreateNode', node: { id: 'T:l', label: '3' } }, { type: 'Link', edge: { id: 'T:root->T:l:L', src: 'T:root', dst: 'T:l', label: 'L' } }],
    snapshot: { nodes: [{ id: 'T:root', label: '5' }, { id: 'T:l', label: '3' }], edges: [{ id: 'T:root->T:l:L', src: 'T:root', dst: 'T:l', label: 'L' }] }
  }
];

export const renderLinkedListDemo = (): ViewState => {
  const renderer = createRenderer();
  renderer.applyStep(linkedListDemo[0], 0);
  renderer.applyStep(linkedListDemo[1], 1);
  const laidOut = layoutLinear(renderer.getState(), { direction: 'horizontal', nodeSpacing: 80 });
  return laidOut;
};

export const renderTreeDemo = (): ViewState => {
  const renderer = createRenderer();
  treeDemo.forEach((step, idx) => renderer.applyStep(step, idx));
  const laidOut = layoutTree(renderer.getState(), { layerGap: 120, siblingGap: 100 });
  return laidOut;
};
