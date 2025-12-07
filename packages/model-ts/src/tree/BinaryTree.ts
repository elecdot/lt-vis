import type { ID, OpStep, Operation, VizEvent } from '@ltvis/shared';
import { Value } from '../core/helpers';
import { TreeBase } from './TreeBase';
import { highlightStep, snapshotFromRoot, TreeNode } from './helpers';

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

  protected handleOperation(op: Operation): OpStep | null {
    if (op.kind === 'Create') {
      return this.createFromPayload(op);
    }
    if (op.kind === 'Traverse') {
      return this.handleTraverse(op.order as Order);
    }
    return this.errorStep('unsupported_op', `${this.kind} does not handle ${op.kind}`);
  }

  private handleTraverse(order: Order): OpStep | null {
    if (!this.root) {
      return this.errorStep('empty_tree', 'Cannot traverse an empty tree');
    }
    const visited = traverse(this.root, order);
    const snapshots = visited.map((nodeId) =>
      highlightStep(nodeId, `Visit ${nodeId}`, snapshotFromRoot(this.id, this.root))
    );
    return snapshots[snapshots.length - 1] ?? null;
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
