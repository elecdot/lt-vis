import type { ID, OpStep, Operation, VizEvent } from '@ltvis/shared';
import { tipEvent, Value } from '../core/helpers';
import { TreeBase } from './TreeBase';
import { edgeId, highlightStep, snapshotFromRoot, TreeNode } from './helpers';

type Order = 'preorder' | 'inorder' | 'postorder' | 'levelorder';

export class BinaryTree extends TreeBase {
  public kind = 'BinaryTree' as const;

  constructor(id: string, initial?: Value[]) {
    super(id, null);
    if (initial) {
      this.root = null;
      this.apply({ kind: 'Create', id, structure: 'BinaryTree', payload: initial });
    }
  }

  protected handleOperation(op: Operation): OpStep | OpStep[] | null {
    if (op.kind === 'Create') {
      return this.createFromPayload(op);
    }
    if (op.kind === 'Attach') {
      return this.handleAttach(op.parent, op.child, op.side);
    }
    if (op.kind === 'Traverse') {
      return this.handleTraverse(op.order as Order);
    }
    return this.errorStep('unsupported_op', `${this.kind} does not handle ${op.kind}`);
  }

  private handleTraverse(order: Order): OpStep[] | OpStep | null {
    if (!this.root) {
      return this.errorStep('empty_tree', 'Cannot traverse an empty tree');
    }
    const visited = traverse(this.root, order);
    if (visited.length === 0) return this.errorStep('empty_traversal', 'Traversal produced no steps');
    return visited.map((nodeId) => {
      const snapshot = snapshotFromRoot(this.id, this.root);
      return highlightStep(nodeId, `Visit ${nodeId}`, snapshot);
    });
  }

  private handleAttach(parentId: ID, childLabel: ID, side: 'left' | 'right'): OpStep {
    if (!this.root) {
      return this.errorStep('empty_tree', 'Cannot attach to empty tree');
    }
    const parent = findNode(this.root, parentId);
    if (!parent) return this.errorStep('not_found', `Parent ${parentId} not found`);
    const isLeft = side === 'left';
    if ((isLeft && parent.left) || (!isLeft && parent.right)) {
      return this.errorStep('occupied', `Parent ${parentId} already has a ${side} child`);
    }
    const normalizedId = childLabel.startsWith(`${this.id}:`) ? childLabel : `${this.id}:${childLabel}`;
    const child: TreeNode = { id: normalizedId, value: childLabel, left: null, right: null };
    if (isLeft) parent.left = child;
    else parent.right = child;
    const snapshot = snapshotFromRoot(this.id, this.root);
    const events: VizEvent[] = [
      {
        type: 'CreateNode',
        node:
          snapshot.nodes.find((n) => n.id === child.id) ??
          ({ id: child.id, label: String(child.value), value: child.value } as any)
      },
      {
        type: 'Link',
        edge: { id: edgeId(parent.id, child.id, isLeft ? 'L' : 'R'), src: parent.id, dst: child.id, label: isLeft ? 'L' : 'R' }
      },
      tipEvent(`Attached ${childLabel} to ${parentId} (${side})`, child.id)
    ];
    return { explain: `Attach ${childLabel}`, events, snapshot };
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

function findNode(root: TreeNode | null, id: ID): TreeNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  return findNode(root.left ?? null, id) ?? findNode(root.right ?? null, id);
}
