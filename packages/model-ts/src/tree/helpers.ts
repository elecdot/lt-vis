import type { ID, OpStep, Operation, StateSnapshot, VizEvent } from '@ltvis/shared';
import { tipEvent, targetId, Value } from '../core/helpers';

export type TreeNode = {
  id: ID;
  value: Value;
  label?: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
};

export const edgeId = (src: ID, dst: ID, label: 'L' | 'R') => `${src}->${dst}:${label}`;

export const snapshotFromRoot = (structureId: ID, root: TreeNode | null): StateSnapshot => {
  if (!root) return { nodes: [], edges: [], meta: { selection: undefined } };
  const nodes: StateSnapshot['nodes'] = [];
  const edges: StateSnapshot['edges'] = [];
  const stack: Array<TreeNode | null> = [root];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    const weight = node.value;
    const charLabel = node.label;
    nodes.push({
      id: node.id,
      label: charLabel ?? String(weight),
      value: weight,
      props: { weight, ...(charLabel ? { char: charLabel } : {}) }
    });
    if (node.left) {
      edges.push({ id: edgeId(node.id, node.left.id, 'L'), src: node.id, dst: node.left.id, label: 'L' });
      stack.push(node.left);
    }
    if (node.right) {
      edges.push({ id: edgeId(node.id, node.right.id, 'R'), src: node.id, dst: node.right.id, label: 'R' });
      stack.push(node.right);
    }
  }

  return { nodes, edges, meta: { selection: root.id } };
};

export const restoreTreeFromSnapshot = (structureId: ID, snapshot: StateSnapshot): TreeNode | null => {
  if (snapshot.nodes.length === 0) return null;
  const nodes = new Map<ID, TreeNode>();
  snapshot.nodes.forEach((n) => {
    const weight =
      typeof n.value === 'number'
        ? n.value
        : typeof (n.props as any)?.weight === 'number'
        ? (n.props as any).weight
        : (n.label as Value);
    const label = (n.props as any)?.char ?? (typeof n.value === 'string' ? n.value : n.label);
    nodes.set(n.id, { id: n.id, value: weight as Value, label, left: null, right: null });
  });
  const incoming = new Map<ID, ID>();
  snapshot.edges.forEach((edge) => {
    if (!nodes.has(edge.src) || !nodes.has(edge.dst)) return;
    if (edge.label === 'L') {
      nodes.get(edge.src)!.left = nodes.get(edge.dst)!;
    } else if (edge.label === 'R') {
      nodes.get(edge.src)!.right = nodes.get(edge.dst)!;
    }
    incoming.set(edge.dst, edge.src);
  });
  const root = snapshot.nodes.find((n) => !incoming.has(n.id)) ?? snapshot.nodes[0];
  return nodes.get(root.id) ?? null;
};

export const buildFromLevelOrder = (structureId: ID, values: Value[]): TreeNode | null => {
  if (values.length === 0) return null;
  const nodes: Array<TreeNode | null> = values.map((v, idx) => ({
    id: `${structureId}:${idx}`,
    value: v,
    left: null,
    right: null
  }));
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    const leftIdx = 2 * i + 1;
    const rightIdx = 2 * i + 2;
    node.left = nodes[leftIdx] ?? null;
    node.right = nodes[rightIdx] ?? null;
  }
  return nodes[0];
};

export const wrongTargetStep = (op: Operation, id: ID, snapshot: StateSnapshot): OpStep => ({
  events: [tipEvent(`Operation target ${targetId(op)} does not match ${id}`)],
  snapshot,
  error: { code: 'wrong_target', message: `Operation target ${targetId(op)} does not match ${id}` }
});

export const notFoundStep = (key: Value, snapshot: StateSnapshot): OpStep => ({
  events: [tipEvent(`Key ${key} not found`)],
  snapshot,
  error: { code: 'not_found', message: `Key ${key} not found` }
});

export const highlightStep = (nodeId: ID, text: string, snapshot: StateSnapshot): OpStep => ({
  events: [
    { type: 'Highlight', target: { kind: 'node', id: nodeId }, style: 'focus' } as VizEvent,
    tipEvent(text, nodeId)
  ],
  explain: text,
  snapshot: { ...snapshot, meta: { ...(snapshot.meta ?? {}), selection: nodeId } }
});
