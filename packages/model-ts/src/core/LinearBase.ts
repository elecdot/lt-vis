import type {
  ID,
  OpStep,
  Operation,
  StateSnapshot,
  Structure,
  StructureKind,
  VizEvent
} from '@ltvis/shared';
import {
  buildLinearSnapshot,
  eventsForSnapshot,
  isValueArray,
  kindMismatch,
  restoreValuesFromSnapshot,
  targetId,
  Value,
  wrongTarget
} from './helpers';

export abstract class LinearBase implements Structure {
  public abstract kind: StructureKind;
  public id: ID;
  protected values: Value[];

  constructor(id: ID, initial?: Value[]) {
    this.id = id;
    this.values = initial ? [...initial] : [];
  }

  snapshot(): StateSnapshot {
    return buildLinearSnapshot(this.id, this.values);
  }

  reset(): void {
    this.values = [];
  }

  resetFromSnapshot(snapshot: StateSnapshot): void {
    this.values = restoreValuesFromSnapshot(this.id, snapshot);
  }

  protected abstract handleOperation(op: Operation): OpStep | null;

  *apply(op: Operation): Iterable<OpStep> {
    if (targetId(op) !== this.id) {
      yield wrongTarget(op, this.id, this.snapshot());
      return;
    }
    const step = this.handleOperation(op);
    if (step) {
      yield step;
    }
  }

  protected errorStep(code: string, message: string): OpStep {
    return {
      events: [{ type: 'Tip', text: message }],
      snapshot: this.snapshot(),
      error: { code, message }
    };
  }

  protected handleCreate(op: Operation, expected: StructureKind): OpStep | null {
    if (op.kind !== 'Create') return null;
    if (op.structure !== expected) return kindMismatch(expected, op.structure, this.snapshot());
    if (op.payload !== undefined && !isValueArray(op.payload)) {
      return this.errorStep('invalid_payload', 'Create payload must be an array of numbers/strings');
    }
    this.values = op.payload ? [...op.payload] : [];
    const snapshot = this.snapshot();
    const events: VizEvent[] = [...eventsForSnapshot(snapshot), { type: 'Tip', text: `Created ${expected}` }];
    return { explain: `Create ${expected}`, events, snapshot };
  }
}
