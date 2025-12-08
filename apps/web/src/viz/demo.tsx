import type { Operation, OpStep } from '@ltvis/shared';
import { createStructure } from '@ltvis/model-ts';
import { layoutLinear, layoutTree } from './layout';
import { createRenderer } from './engine';
import type { ViewState } from './types';

const runOperations = (kind: Operation['kind'][], ops: Operation[]): OpStep[] => {
  const createOp = ops.find((op) => op.kind === 'Create') as Operation | undefined;
  const target = (createOp && (createOp as any).id) || (ops.find((o) => 'target' in o) as any)?.target;
  const structure = createStructure((createOp as any)?.structure ?? 'SeqList', target, (createOp as any)?.payload);
  const steps: OpStep[] = [];
  ops.forEach((op) => {
    for (const s of structure.apply(op as any)) {
      steps.push(s);
    }
  });
  return steps;
};

export const renderLinkedListDemo = (): ViewState => {
  const ops: Operation[] = [
    { kind: 'Create', id: 'LL:demo', structure: 'LinkedList', payload: [1, 3, 4] },
    { kind: 'Insert', target: 'LL:demo', pos: 1, value: 2 }
  ];
  const steps = runOperations(['Create', 'Insert'], ops);
  const renderer = createRenderer();
  steps.forEach((s, idx) => renderer.applyStep(s, idx));
  return layoutLinear(renderer.getState(), { direction: 'horizontal', nodeSpacing: 90 });
};

export const renderTreeDemo = (): ViewState => {
  const ops: Operation[] = [
    { kind: 'Create', id: 'BST:demo', structure: 'BST', payload: [5, 3, 7, 2, 4, 6, 8] },
    { kind: 'Delete', target: 'BST:demo', key: 7 }
  ];
  const steps = runOperations(['Create', 'Delete'], ops);
  const renderer = createRenderer();
  steps.forEach((s, idx) => renderer.applyStep(s, idx));
  return layoutTree(renderer.getState(), { layerGap: 140, siblingGap: 120 });
};
