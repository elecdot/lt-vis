import type { OpStep, Operation, VizEvent } from '@ltvis/shared';
import { tipEvent, Value } from '../core/helpers';
import { TreeBase } from './TreeBase';
import { edgeId, snapshotFromForest, snapshotFromRoot, TreeNode } from './helpers';

type WeightMap = Record<string, number>;

export class HuffmanTree extends TreeBase {
  public kind = 'Huffman' as const;
  private counter = 0;

  constructor(id: string) {
    super(id, null);
  }

  protected handleOperation(op: Operation): OpStep | OpStep[] | null {
    if (op.kind === 'BuildHuffman') {
      return this.build(op.weights);
    }
    if (op.kind === 'Create') {
      if (op.structure && op.structure !== this.kind) {
        return this.errorStep('kind_mismatch', `Cannot create ${op.structure} on ${this.kind}`);
      }
      this.reset();
      return { explain: 'Reset Huffman tree', events: [], snapshot: this.snapshot() };
    }
    return this.errorStep('unsupported_op', `${this.kind} does not handle ${op.kind}`);
  }

  private leaf(char: string, weight: number): TreeNode {
    return { id: `${this.id}:${char}`, value: weight, label: char, left: null, right: null };
  }

  private internal(left: TreeNode, right: TreeNode): TreeNode {
    const node: TreeNode = {
      id: `${this.id}:n${this.counter++}`,
      value: (left.value as number) + (right.value as number),
      left,
      right
    };
    return node;
  }

  private build(weights: WeightMap): OpStep[] {
    const entries = Object.entries(weights);
    if (entries.length === 0) {
      this.reset();
      return [this.errorStep('invalid_payload', 'Weights map is empty')];
    }

    let forest: TreeNode[] = entries.map(([char, weight]) => this.leaf(char, weight));
    const steps: OpStep[] = [];
    steps.push({
      explain: 'Init Huffman leaves',
      events: forest.map((node) => ({ type: 'CreateNode', node })),
      snapshot: snapshotFromForest(forest)
    });

    while (forest.length > 1) {
      forest.sort((a, b) => (a.value as number) - (b.value as number));
      const left = forest.shift()!;
      const right = forest.shift()!;
      const parent = this.internal(left, right);
      forest.push(parent);
      const snapshot = snapshotFromForest(forest);
      steps.push({
        explain: 'Merge step',
        events: [
          { type: 'Highlight', target: { kind: 'node', id: left.id }, style: 'compare' },
          { type: 'Highlight', target: { kind: 'node', id: right.id }, style: 'compare' },
          { type: 'CreateNode', node: snapshot.nodes.find((n) => n.id === parent.id) ?? { id: parent.id, value: parent.value } as any },
          { type: 'Link', edge: { id: edgeId(parent.id, left.id, 'L'), src: parent.id, dst: left.id, label: 'L' } },
          { type: 'Link', edge: { id: edgeId(parent.id, right.id, 'R'), src: parent.id, dst: right.id, label: 'R' } },
          tipEvent(`Merge ${left.label ?? left.id} (${left.value}) + ${right.label ?? right.id} (${right.value})`, parent.id)
        ],
        snapshot
      });
    }

    this.root = forest[0] ?? null;
    const snapshot = this.snapshot();
    steps.push({
      explain: 'Huffman tree built',
      events: [
        ...snapshot.edges.map((edge) => ({ type: 'Link', edge } as VizEvent)),
        tipEvent('Huffman tree built', snapshot.meta?.selection ?? undefined)
      ],
      snapshot
    });
    return steps;
  }
}
