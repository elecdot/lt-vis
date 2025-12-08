import type { ViewState } from './types';

interface LinearLayoutOptions {
  direction?: 'horizontal' | 'vertical';
  nodeSpacing?: number;
}

interface TreeLayoutOptions {
  layerGap?: number;
  siblingGap?: number;
}

export const layoutLinear = (state: ViewState, options?: LinearLayoutOptions): ViewState => {
  const spacing = options?.nodeSpacing ?? 120;
  const vertical = options?.direction === 'vertical';
  const ordered = Array.from(state.nodes.values()).sort((a, b) => {
    const ai = typeof a.props?.index === 'number' ? (a.props.index as number) : parseInt(a.id.split(':').pop() ?? '0', 10);
    const bi = typeof b.props?.index === 'number' ? (b.props.index as number) : parseInt(b.id.split(':').pop() ?? '0', 10);
    return ai - bi;
  });
  ordered.forEach((node, idx) => {
    if (node.pinned) return;
    const x = vertical ? 0 : idx * spacing;
    const y = vertical ? idx * spacing : 0;
    state.nodes.set(node.id, { ...node, x, y });
  });
  return state;
};

export const layoutTree = (state: ViewState, options?: TreeLayoutOptions): ViewState => {
  const layerGap = options?.layerGap ?? 160;
  const siblingGap = options?.siblingGap ?? 140;

  // Build adjacency to find roots
  const children = new Map<string, string[]>();
  state.edges.forEach((edge) => {
    children.set(edge.src, [...(children.get(edge.src) ?? []), edge.dst]);
  });
  const childIds = new Set(Array.from(state.edges.values()).map((e) => e.dst));
  const roots = Array.from(state.nodes.keys()).filter((id) => !childIds.has(id));

  roots.forEach((rootId, rootIdx) => {
    assignPositions(state, rootId, 0, rootIdx * siblingGap, layerGap, siblingGap, children);
  });

  return state;
};

const assignPositions = (
  state: ViewState,
  nodeId: string,
  depth: number,
  offset: number,
  layerGap: number,
  siblingGap: number,
  children: Map<string, string[]>
) => {
  const node = state.nodes.get(nodeId);
  if (node && !node.pinned) {
    state.nodes.set(nodeId, { ...node, x: offset, y: depth * layerGap });
  }
  const childList = children.get(nodeId) ?? [];
  childList.forEach((childId, idx) => {
    assignPositions(state, childId, depth + 1, offset + (idx - (childList.length - 1) / 2) * siblingGap, layerGap, siblingGap, children);
  });
};
