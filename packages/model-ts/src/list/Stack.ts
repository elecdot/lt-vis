import type { OpStep, Operation, VizEvent } from '@ltvis/shared';
import { LinearBase } from '../core/LinearBase';
import { Value } from '../core/helpers';

export class Stack extends LinearBase {
  public kind = 'Stack' as const;

  constructor(id: string, initial?: Value[]) {
    super(id, initial);
  }

  protected handleOperation(op: Operation): OpStep | OpStep[] | null {
    if (op.kind === 'Create') {
      return this.handleCreate(op, this.kind);
    }

    switch (op.kind) {
      case 'Push': {
        if (op.value === undefined) return this.errorStep('invalid_value', 'Push requires a value');
        const steps: OpStep[] = [];
        const before = this.snapshot();
        steps.push({
          explain: 'Highlight top',
          events: before.nodes.length
            ? [{ type: 'Highlight', target: { kind: 'node', id: before.nodes[before.nodes.length - 1].id }, style: 'focus' }]
            : [],
          snapshot: before
        });
        this.values.push(op.value);
        const snapshot = this.snapshot();
        const nodeId = `${this.id}:${this.values.length - 1}`;
        const events: VizEvent[] = [
          { type: 'CreateNode', node: snapshot.nodes[snapshot.nodes.length - 1] },
          { type: 'Tip', text: `Pushed ${op.value}`, anchor: nodeId }
        ];
        steps.push({ explain: 'Push', events, snapshot });
        return steps;
      }
      case 'Pop': {
        if (this.values.length === 0) return this.errorStep('empty_stack', 'Cannot pop from an empty stack');
        const steps: OpStep[] = [];
        const topId = `${this.id}:${this.values.length - 1}`;
        steps.push({
          explain: 'Highlight top',
          events: [{ type: 'Highlight', target: { kind: 'node', id: topId }, style: 'focus' }],
          snapshot: this.snapshot()
        });
        this.values.pop();
        const snapshot = this.snapshot();
        const events: VizEvent[] = [
          { type: 'RemoveNode', id: topId },
          { type: 'Tip', text: 'Popped top value', anchor: snapshot.nodes[snapshot.nodes.length - 1]?.id }
        ];
        steps.push({ explain: 'Pop', events, snapshot });
        return steps;
      }
      default:
        return this.errorStep('unsupported_op', `${this.kind} does not handle ${op.kind}`);
    }
  }
}
