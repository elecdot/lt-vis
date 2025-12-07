import type {
  ID,
  NodeState,
  OpStep,
  Operation,
  StateSnapshot,
  StructureKind,
  VizEvent
} from '@ltvis/shared';

export type Value = number | string;

export const isValueArray = (payload: unknown): payload is Value[] =>
  Array.isArray(payload) && payload.every((v) => typeof v === 'number' || typeof v === 'string');

export const targetId = (op: Operation): ID => (op.kind === 'Create' ? op.id : op.target);

/**
 * Build a simple linear snapshot for list/stack structures.
 */
export const buildLinearSnapshot = (structureId: ID, values: Value[]): StateSnapshot => {
  const nodes = values.map((value, idx) => ({
    id: `${structureId}:${idx}`,
    label: String(value),
    value,
    x: idx,
    y: 0
  }));

  const edges = values
    .map((_value, idx) => {
      if (idx === values.length - 1) return null;
      const src = `${structureId}:${idx}`;
      const dst = `${structureId}:${idx + 1}`;
      const label = 'next';
      return {
        id: `${src}->${dst}:${label}`,
        src,
        dst,
        label
      };
    })
    .filter(Boolean) as StateSnapshot['edges'];

  return { nodes, edges, meta: { selection: nodes[0]?.id, step: undefined } };
};

export const eventsForSnapshot = (snapshot: StateSnapshot): VizEvent[] => {
  const nodeEvents: VizEvent[] = snapshot.nodes.map((node) => ({ type: 'CreateNode', node }));
  const edgeEvents: VizEvent[] = snapshot.edges.map((edge) => ({ type: 'Link', edge }));
  return [...nodeEvents, ...edgeEvents];
};

export const tipEvent = (text: string, anchor?: ID): VizEvent => ({
  type: 'Tip',
  text,
  anchor
});

export const restoreValuesFromSnapshot = (structureId: ID, snapshot: StateSnapshot): Value[] => {
  const nodes = snapshot.nodes.filter((n) => n.id.startsWith(`${structureId}:`));
  if (nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<ID, ID>();
  const incoming = new Map<ID, ID>();

  snapshot.edges.forEach((edge) => {
    if (!edge.src.startsWith(`${structureId}:`) || !edge.dst.startsWith(`${structureId}:`)) return;
    outgoing.set(edge.src, edge.dst);
    incoming.set(edge.dst, edge.src);
  });

  const head = nodes.find((n) => !incoming.has(n.id));
  const ordered: Value[] = [];
  if (head) {
    let current: ID | undefined = head.id;
    const seen = new Set<ID>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const node = nodeMap.get(current);
      if (node) {
        if (typeof node.value === 'number' || typeof node.value === 'string') {
          ordered.push(node.value);
        } else if (node.label !== undefined) {
          ordered.push(node.label);
        }
      }
      current = outgoing.get(current);
    }
  }

  if (ordered.length === nodes.length) return ordered;
  return nodes
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((node) =>
      typeof node.value === 'number' || typeof node.value === 'string'
        ? node.value
        : (node.label as Value)
    );
};

export const wrongTarget = (op: Operation, id: ID, snapshot: StateSnapshot): OpStep => ({
  events: [{ type: 'Tip', text: `Operation target ${targetId(op)} does not match ${id}` }],
  snapshot,
  error: { code: 'wrong_target', message: `Operation target ${targetId(op)} does not match ${id}` }
});

export const kindMismatch = (
  expected: StructureKind,
  actual: StructureKind,
  snapshot: StateSnapshot
): OpStep => ({
  events: [{ type: 'Tip', text: `Cannot create ${actual} on ${expected}` }],
  snapshot,
  error: { code: 'kind_mismatch', message: `Cannot create ${actual} on ${expected}` }
});
