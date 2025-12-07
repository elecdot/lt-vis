import { describe, expect, it } from 'vitest';
import { applyEvent, createEmptyViewState } from './engine';
import { layoutLinear, layoutTree } from './layout';

describe('layoutLinear', () => {
  it('orders by index and leaves pinned nodes untouched', () => {
    const state = createEmptyViewState();
    applyEvent(state, { type: 'CreateNode', node: { id: 'a', label: 'A', props: { index: 1 } } });
    applyEvent(state, { type: 'CreateNode', node: { id: 'b', label: 'B', props: { index: 0 }, pinned: true, x: 999, y: 999 } });
    layoutLinear(state, { direction: 'horizontal', nodeSpacing: 50 });
    expect(state.nodes.get('a')?.x).toBe(50);
    expect(state.nodes.get('b')?.x).toBe(999);
  });
});

describe('layoutTree', () => {
  it('places parent above children with left/right ordering', () => {
    const state = createEmptyViewState();
    applyEvent(state, { type: 'CreateNode', node: { id: 'root', label: 'R' } });
    applyEvent(state, { type: 'CreateNode', node: { id: 'l', label: 'L' } });
    applyEvent(state, { type: 'CreateNode', node: { id: 'r', label: 'R' } });
    applyEvent(state, { type: 'Link', edge: { id: 'root->l:L', src: 'root', dst: 'l', label: 'L' } });
    applyEvent(state, { type: 'Link', edge: { id: 'root->r:R', src: 'root', dst: 'r', label: 'R' } });
    layoutTree(state, { layerGap: 100, siblingGap: 80 });
    const rootY = state.nodes.get('root')?.y ?? 0;
    expect((state.nodes.get('l')?.y ?? 0) > rootY).toBe(true);
    expect((state.nodes.get('r')?.y ?? 0) > rootY).toBe(true);
    expect((state.nodes.get('l')?.x ?? 0) < (state.nodes.get('r')?.x ?? 0)).toBe(true);
  });
});
