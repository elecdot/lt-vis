import type { OpStep, Operation, VizEvent } from '@ltvis/shared';
import { LinearBase } from '../core/LinearBase';
import { Value, targetId } from '../core/helpers';

export class SeqList extends LinearBase {
  public kind = 'SeqList' as const;

  constructor(id: string, initial?: Value[]) {
    super(id, initial);
  }

  protected handleOperation(op: Operation): OpStep | null {
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
        this.values.splice(pos, 0, op.value);
        const snapshot = this.snapshot();
        const nodeId = `${this.id}:${pos}`;
        const events: VizEvent[] = [
          { type: 'CreateNode', node: snapshot.nodes[pos] },
          { type: 'Tip', text: `Inserted ${op.value} at ${pos}`, anchor: nodeId }
        ];
        return { explain: `Insert at ${pos}`, events, snapshot };
      }
      case 'Delete': {
        const pos = op.pos ?? this.values.length - 1;
        if (pos < 0 || pos >= this.values.length) {
          return this.errorStep('out_of_bounds', `Delete position ${pos} is invalid`);
        }
        this.values.splice(pos, 1);
        const snapshot = this.snapshot();
        const events: VizEvent[] = [
          { type: 'RemoveNode', id: `${this.id}:${pos}` },
          { type: 'Tip', text: `Deleted index ${pos}`, anchor: snapshot.nodes[pos]?.id }
        ];
        return { explain: `Delete at ${pos}`, events, snapshot };
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
