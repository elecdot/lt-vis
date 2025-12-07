import type { OpStep, Operation, VizEvent } from '@ltvis/shared';
import { LinearBase } from '../core/LinearBase';
import { Value } from '../core/helpers';

export class Stack extends LinearBase {
  public kind = 'Stack' as const;

  constructor(id: string, initial?: Value[]) {
    super(id, initial);
  }

  protected handleOperation(op: Operation): OpStep | null {
    if (op.kind === 'Create') {
      return this.handleCreate(op, this.kind);
    }

    switch (op.kind) {
      case 'Push': {
        if (op.value === undefined) return this.errorStep('invalid_value', 'Push requires a value');
        this.values.push(op.value);
        const snapshot = this.snapshot();
        const nodeId = `${this.id}:${this.values.length - 1}`;
        const events: VizEvent[] = [
          { type: 'CreateNode', node: snapshot.nodes[snapshot.nodes.length - 1] },
          { type: 'Tip', text: `Pushed ${op.value}`, anchor: nodeId }
        ];
        return { explain: 'Push', events, snapshot };
      }
      case 'Pop': {
        if (this.values.length === 0) return this.errorStep('empty_stack', 'Cannot pop from an empty stack');
        const removedId = `${this.id}:${this.values.length - 1}`;
        this.values.pop();
        const snapshot = this.snapshot();
        const events: VizEvent[] = [
          { type: 'RemoveNode', id: removedId },
          { type: 'Tip', text: 'Popped top value', anchor: snapshot.nodes[snapshot.nodes.length - 1]?.id }
        ];
        return { explain: 'Pop', events, snapshot };
      }
      default:
        return this.errorStep('unsupported_op', `${this.kind} does not handle ${op.kind}`);
    }
  }
}
