import type { Edge, Node } from 'reactflow';
import type { ViewState } from './types';

export const toReactFlow = (state: ViewState): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = Array.from(state.nodes.values()).map((n) => ({
    id: n.id,
    position: { x: n.x ?? 0, y: n.y ?? 0 },
    data: { label: n.label ?? String(n.value ?? n.id) },
    type: 'default',
    draggable: !n.pinned
  }));

  const edges: Edge[] = Array.from(state.edges.values()).map((e) => ({
    id: e.id,
    source: e.src,
    target: e.dst,
    label: e.label
  }));

  return { nodes, edges };
};
