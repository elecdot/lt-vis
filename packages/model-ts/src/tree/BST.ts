import type { ID, OpStep, Operation, VizEvent } from '@ltvis/shared';
import { tipEvent, Value } from '../core/helpers';
import { TreeBase } from './TreeBase';
import {
  edgeId,
  highlightStep,
  notFoundStep,
  snapshotFromRoot,
  TreeNode
} from './helpers';

type Order = 'preorder' | 'inorder' | 'postorder' | 'levelorder';

export class BST extends TreeBase {
  public kind = 'BST' as const;
  private counter = 0;

  constructor(id: string, initial?: Value[]) {
    super(id, null);
    if (initial) {
      this.apply({ kind: 'Create', id, structure: 'BST', payload: initial });
    }
  }

  protected handleOperation(op: Operation): OpStep | OpStep[] | null {
    if (op.kind === 'Create') {
      if (op.structure && op.structure !== this.kind) {
        return this.errorStep('kind_mismatch', `Cannot create ${op.structure} on ${this.kind}`);
      }
      this.reset();
      if (op.payload && !Array.isArray(op.payload)) {
        return this.errorStep('invalid_payload', 'Create payload must be an array');
      }
      const payload = (op.payload as Value[] | undefined) ?? [];
      const steps: OpStep[] = [];
      payload.forEach((v) => {
        const inserted = this.insertValue(v);
        if (inserted) {
          if (Array.isArray(inserted)) steps.push(...inserted);
          else steps.push(inserted);
        }
      });
      return steps.length ? steps : null;
    }
    if (op.kind === 'Insert') {
      if (op.value === undefined) return this.errorStep('invalid_value', 'Insert requires a value');
      const step = this.insertValue(op.value);
      return step ?? this.errorStep('insert_failed', 'Insert failed');
    }
    if (op.kind === 'Find') {
      return this.findValue(op.key);
    }
    if (op.kind === 'Delete') {
      if (op.key === undefined) return this.errorStep('invalid_key', 'Delete requires a key');
      return this.deleteValue(op.key);
    }
    if (op.kind === 'Traverse') {
      return this.traverse(op.order as Order);
    }
    return this.errorStep('unsupported_op', `${this.kind} does not handle ${op.kind}`);
  }

  private newNode(value: Value): TreeNode {
    const node: TreeNode = { id: `${this.id}:${this.counter++}`, value, left: null, right: null };
    return node;
  }

  private insertValue(value: Value): OpStep[] | null {
    const steps: OpStep[] = [];
    if (!this.root) {
      this.root = this.newNode(value);
      const snapshot = this.snapshot();
      steps.push({ explain: `Insert ${value}`, events: [{ type: 'CreateNode', node: snapshot.nodes[0] } as VizEvent], snapshot });
    } else {
      let current = this.root;
      const traverseEvents: VizEvent[] = [];
      while (true) {
        if (value < current.value) {
          traverseEvents.push({ type: 'Highlight', target: { kind: 'node', id: current.id }, style: 'traverse' });
          if (!current.left) {
            current.left = this.newNode(value);
            const snapshot = this.snapshot();
            steps.push({
              explain: `Traverse left from ${current.id}`,
              events: traverseEvents,
              snapshot
            });
            steps.push({
              explain: `Insert ${value}`,
              events: [
                { type: 'CreateNode', node: snapshot.nodes.find((n) => n.id === current.left!.id) ?? { id: current.left!.id, value } } as VizEvent,
                { type: 'Link', edge: { id: edgeId(current.id, current.left.id, 'L'), src: current.id, dst: current.left.id, label: 'L' } },
                tipEvent(`Inserted ${value}`, current.left.id)
              ],
              snapshot
            });
            break;
          }
          current = current.left;
        } else if (value > current.value) {
          traverseEvents.push({ type: 'Highlight', target: { kind: 'node', id: current.id }, style: 'traverse' });
          if (!current.right) {
            current.right = this.newNode(value);
            const snapshot = this.snapshot();
            steps.push({
              explain: `Traverse right from ${current.id}`,
              events: traverseEvents,
              snapshot
            });
            steps.push({
              explain: `Insert ${value}`,
              events: [
                { type: 'CreateNode', node: snapshot.nodes.find((n) => n.id === current.right!.id) ?? { id: current.right!.id, value } } as VizEvent,
                { type: 'Link', edge: { id: edgeId(current.id, current.right.id, 'R'), src: current.id, dst: current.right.id, label: 'R' } },
                tipEvent(`Inserted ${value}`, current.right.id)
              ],
              snapshot
            });
            break;
          }
          current = current.right;
        } else {
          return [this.errorStep('duplicate', `Value ${value} already exists`)];
        }
      }
    }
    return steps;
  }

  private findValue(key: Value): OpStep | OpStep[] {
    let current = this.root;
    const steps: OpStep[] = [];
    while (current) {
      const snapshot = this.snapshot();
      const events: VizEvent[] = [
        { type: 'Highlight', target: { kind: 'node', id: current.id }, style: 'traverse' }
      ];
      if (key === current.value) {
        events.push(tipEvent(`Found ${key}`, current.id));
        steps.push({ explain: `Find ${key}`, events, snapshot: { ...snapshot, meta: { ...(snapshot.meta ?? {}), selection: current.id } } });
        return steps;
      }
      steps.push({ explain: `Traverse for ${key}`, events, snapshot: { ...snapshot, meta: { ...(snapshot.meta ?? {}), selection: current.id } } });
      current = key < current.value ? current.left ?? null : current.right ?? null;
    }
    steps.push(notFoundStep(key, this.snapshot()));
    return steps;
  }

  private deleteValue(key: Value): OpStep | OpStep[] {
    const steps: OpStep[] = [];
    let parent: TreeNode | null = null;
    let current = this.root;
    let direction: 'L' | 'R' | null = null;

    while (current && current.value !== key) {
      steps.push({
        explain: `Traverse for ${key}`,
        events: [{ type: 'Highlight', target: { kind: 'node', id: current.id }, style: 'traverse' }],
        snapshot: this.snapshot()
      });
      parent = current;
      if (key < current.value) {
        direction = 'L';
        current = current.left ?? null;
      } else {
        direction = 'R';
        current = current.right ?? null;
      }
    }

    if (!current) {
      return notFoundStep(key, this.snapshot());
    }

    // Case: two children
    if (current.left && current.right) {
      let succParent = current;
      let succ = current.right;
      let succDir: 'L' | 'R' = 'R';
      while (succ.left) {
        succParent = succ;
        succDir = 'L';
        succ = succ.left;
      }
      current.value = succ.value;
      // Remove successor node
      if (succDir === 'L') succParent.left = succ.right ?? null;
      else succParent.right = succ.right ?? null;
    } else {
      const child = current.left ?? current.right ?? null;
      if (!parent) {
        this.root = child;
      } else if (direction === 'L') {
        parent.left = child;
      } else {
        parent.right = child;
      }
    }

    const snapshot = this.snapshot();
    steps.push({
      explain: `Delete ${key}`,
      events: [
        ...(parent && direction ? [{ type: 'Unlink', id: edgeId(parent.id, current.id, direction), src: parent.id, dst: current.id } as VizEvent] : []),
        { type: 'RemoveNode', id: current.id },
        tipEvent(`Deleted ${key}`)
      ],
      snapshot
    });
    return steps;
  }

  private traverse(order: Order): OpStep[] | OpStep {
    if (!this.root) return this.errorStep('empty_tree', 'Cannot traverse empty BST');
    const visited = traverse(this.root, order);
    if (visited.length === 0) return this.errorStep('empty_traversal', 'Traversal produced no steps');
    return visited.map((nodeId) => {
      const snapshot = this.snapshot();
      return highlightStep(nodeId, `Visit ${nodeId}`, snapshot);
    });
  }
}

const traverse = (root: TreeNode, order: Order): ID[] => {
  const result: ID[] = [];
  const visit = (node: TreeNode | null) => {
    if (!node) return;
    if (order === 'preorder') result.push(node.id);
    visit(node.left ?? null);
    if (order === 'inorder') result.push(node.id);
    visit(node.right ?? null);
    if (order === 'postorder') result.push(node.id);
  };
  if (order === 'levelorder') {
    const queue: Array<TreeNode | null> = [root];
    while (queue.length) {
      const node = queue.shift();
      if (!node) continue;
      result.push(node.id);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    return result;
  }
  visit(root);
  return result;
};
