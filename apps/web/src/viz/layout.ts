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
  const spacing = options?.nodeSpacing ?? 150;
  const vertical = options?.direction === 'vertical';
  const ordered = Array.from(state.nodes.values()).sort((a, b) => {
    const ai = typeof a.props?.index === 'number' ? (a.props.index as number) : parseInt(a.id.split(':').pop() ?? '0', 10);
    const bi = typeof b.props?.index === 'number' ? (b.props.index as number) : parseInt(b.id.split(':').pop() ?? '0', 10);
    return ai - bi;
  });
  const offset = ((ordered.length - 1) * spacing) / 2;
  ordered.forEach((node, idx) => {
    if (node.pinned) return;
    const x = vertical ? 0 : idx * spacing - offset;
    const y = vertical ? idx * spacing : 0;
    state.nodes.set(node.id, { ...node, x, y });
  });
  return state;
};

export const layoutTree = (state: ViewState, options?: TreeLayoutOptions): ViewState => {
  const layerGap = options?.layerGap ?? 200;
  const siblingGap = options?.siblingGap ?? 160;

  // Build adjacency to find roots
  const children = new Map<string, string[]>();
  state.edges.forEach((edge) => {
    children.set(edge.src, [...(children.get(edge.src) ?? []), edge.dst]);
  });
  const childIds = new Set(Array.from(state.edges.values()).map((e) => e.dst));
  const roots = Array.from(state.nodes.keys()).filter((id) => !childIds.has(id));

  const subtreeWidth = (nodeId: string): number => {
    const [left, right] = children.get(nodeId) ?? [];
    const leftWidth = left ? subtreeWidth(left) : 1;
    const rightWidth = right ? subtreeWidth(right) : 1;
    return leftWidth + rightWidth;
  };

  const assignPositions = (nodeId: string, depth: number, offset: number) => {
    const node = state.nodes.get(nodeId);
    if (node && !node.pinned) {
      state.nodes.set(nodeId, { ...node, x: offset, y: depth * layerGap });
    }
    const childList = children.get(nodeId) ?? [];
    if (childList.length === 0) return;
    const [left, right] = childList;
    if (left) {
      const rightWidth = right ? subtreeWidth(right) : 0;
      assignPositions(left, depth + 1, offset - (rightWidth + 1) * siblingGap * 0.5);
    }
    if (right) {
      const leftWidth = left ? subtreeWidth(left) : 0;
      assignPositions(right, depth + 1, offset + (leftWidth + 1) * siblingGap * 0.5);
    }
  };

  roots.forEach((rootId, rootIdx) => {
    assignPositions(rootId, 0, rootIdx * siblingGap * 2);
  });

  return state;
};
