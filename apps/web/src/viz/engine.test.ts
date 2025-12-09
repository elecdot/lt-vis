import { describe, expect, it } from 'vitest';
import type { OpStep } from '@ltvis/shared';
import { applyEvent, applySteps, createEmptyViewState, createRenderer } from './engine';

describe('viz engine', () => {
  it('applyEvent is idempotent for CreateNode/Link/Highlight', () => {
    const state = createEmptyViewState();
    applyEvent(state, { type: 'CreateNode', node: { id: 'n1', label: '1' } });
    applyEvent(state, { type: 'CreateNode', node: { id: 'n1', label: '1' } });
    applyEvent(state, { type: 'Link', edge: { id: 'e1', src: 'n1', dst: 'n1' } });
    applyEvent(state, { type: 'Link', edge: { id: 'e1', src: 'n1', dst: 'n1' } });
    applyEvent(state, { type: 'Highlight', target: { kind: 'node', id: 'n1' } });
    expect(state.nodes.size).toBe(1);
    expect(state.edges.size).toBe(1);
    expect(state.nodes.get('n1')?.highlighted).toBe(true);
  });

  it('applySteps updates meta and nodes', () => {
    const state = createEmptyViewState();
    const steps: OpStep[] = [
      {
        explain: 'step1',
        events: [{ type: 'CreateNode', node: { id: 'a', label: 'A' } }],
        snapshot: { nodes: [{ id: 'a', label: 'A' }], edges: [] }
      },
      {
        explain: 'step2',
        events: [{ type: 'Move', id: 'a', x: 10, y: 20 }],
        snapshot: { nodes: [{ id: 'a', label: 'A', x: 10, y: 20 }], edges: [] }
      }
    ];
    applySteps(state, steps);
    expect(state.nodes.get('a')?.x).toBeDefined();
    expect(state.meta.stepIndex).toBe(1);
    expect(state.meta.explain).toBe('step2');
  });

  it('renderer play applies all steps', async () => {
    const renderer = createRenderer();
    const steps: OpStep[] = [
      { events: [{ type: 'CreateNode', node: { id: 'x', label: 'X' } }], snapshot: { nodes: [{ id: 'x' }], edges: [] } },
      { events: [{ type: 'Tip', text: 'done', anchor: 'x' }], snapshot: { nodes: [{ id: 'x' }], edges: [], meta: { selection: 'x' } } }
    ];
    await renderer.play(steps);
    expect(renderer.getState().nodes.has('x')).toBe(true);
    expect(renderer.getState().meta.currentTip).toBe('done');
  });

  it('handles compare/swap/rotate/rebalance safely', () => {
    const state = createEmptyViewState();
    applyEvent(state, { type: 'CreateNode', node: { id: 'a' } });
    applyEvent(state, { type: 'CreateNode', node: { id: 'b' } });
    applyEvent(state, { type: 'Compare', a: 'a', b: 'b' });
    expect(state.meta.currentTip).toContain('Compare');
    applyEvent(state, { type: 'Swap', a: 'a', b: 'b' });
    expect(state.nodes.has('a')).toBe(true);
    expect(state.nodes.has('b')).toBe(true);
    applyEvent(state, { type: 'Rotate', kind: 'LL', pivot: 'a' });
    applyEvent(state, { type: 'Rebalance' });
    expect(state.meta.currentTip).toBe('Rebalance');
  });
});
