import type { OpStep, Operation, VizEvent } from '@ltvis/shared';
import { LinearBase } from '../core/LinearBase';
import { Value } from '../core/helpers';

export class LinkedList extends LinearBase {
  public kind = 'LinkedList' as const;

  constructor(id: string, initial?: Value[]) {
    super(id, initial);
  }

  protected handleOperation(op: Operation): OpStep | OpStep[] | null {
    if (op.kind === 'Create') {
      return this.handleCreate(op, this.kind);
    }

    switch (op.kind) {
      case 'Insert': {
        const pos = op.pos ?? this.values.length;
        if (op.value === undefined) return this.errorStep('invalid_value', 'Insert requires a value');
        if (pos < 0 || pos > this.values.length) {
          return this.errorStep('out_of_bounds', `Insert position ${pos} is invalid`);
        }
        const steps: OpStep[] = [];
        for (let i = 0; i < pos; i++) {
          const snapshot = this.snapshot();
          steps.push({
            explain: `Traverse to index ${i}`,
            events: [{ type: 'Highlight', target: { kind: 'node', id: `${this.id}:${i}` }, style: 'traverse' }],
            snapshot
          });
        }
        this.values.splice(pos, 0, op.value);
        const snapshot = this.snapshot();
        const nodeId = `${this.id}:${pos}`;
        const events: VizEvent[] = [
          { type: 'Unlink', id: `${this.id}:${pos - 1}->${this.id}:${pos}:next`, src: `${this.id}:${pos - 1}`, dst: `${this.id}:${pos}` },
          { type: 'CreateNode', node: snapshot.nodes[pos] },
          { type: 'Link', edge: { id: `${this.id}:${pos - 1}->${nodeId}:next`, src: `${this.id}:${pos - 1}`, dst: nodeId, label: 'next' } },
          { type: 'Link', edge: { id: `${nodeId}->${this.id}:${pos + 1}:next`, src: nodeId, dst: `${this.id}:${pos + 1}`, label: 'next' } },
          ...snapshot.nodes.map((n, idx) => ({ type: 'Move', id: n.id, x: idx, y: 0 } as VizEvent)),
          { type: 'Tip', text: `Inserted ${op.value} at ${pos}`, anchor: nodeId }
        ];
        steps.push({ explain: `Insert at ${pos}`, events, snapshot });
        return steps;
      }
      case 'Delete': {
        const pos = op.pos ?? this.values.length - 1;
        if (pos < 0 || pos >= this.values.length) {
          return this.errorStep('out_of_bounds', `Delete position ${pos} is invalid`);
        }
        const steps: OpStep[] = [];
        for (let i = 0; i <= pos; i++) {
          const snapshot = this.snapshot();
          steps.push({
            explain: `Traverse to index ${i}`,
            events: [{ type: 'Highlight', target: { kind: 'node', id: `${this.id}:${i}` }, style: 'traverse' }],
            snapshot
          });
        }
        const removedId = `${this.id}:${pos}`;
        this.values.splice(pos, 1);
        const snapshot = this.snapshot();
        const events: VizEvent[] = [
          { type: 'Unlink', id: `${this.id}:${pos - 1}->${removedId}:next`, src: `${this.id}:${pos - 1}`, dst: removedId },
          { type: 'RemoveNode', id: removedId },
          ...snapshot.nodes.map((n, idx) => ({ type: 'Move', id: n.id, x: idx, y: 0 } as VizEvent)),
          { type: 'Tip', text: `Deleted index ${pos}`, anchor: snapshot.nodes[pos]?.id }
        ];
        steps.push({ explain: `Delete at ${pos}`, events, snapshot });
        return steps;
      }
      case 'Find': {
        const idx = this.values.findIndex((v) => v === op.key);
        if (idx === -1) return this.errorStep('not_found', `Key ${op.key} not found`);
        const snapshot = this.snapshot();
        const nodeId = `${this.id}:${idx}`;
        const events: VizEvent[] = [
          { type: 'Highlight', target: { kind: 'node', id: nodeId }, style: 'found' },
          { type: 'Tip', text: `Found ${op.key} at index ${idx}`, anchor: nodeId }
        ];
        return { explain: `Find ${op.key}`, events, snapshot };
      }
      default:
        return this.errorStep('unsupported_op', `${this.kind} does not handle ${op.kind}`);
    }
  }
}
