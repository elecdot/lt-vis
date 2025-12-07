import type { ID, OpStep, Operation, StateSnapshot, Structure, StructureKind, VizEvent } from '@ltvis/shared';
import { eventsForSnapshot, isValueArray, tipEvent } from '../core/helpers';
import {
  buildFromLevelOrder,
  restoreTreeFromSnapshot,
  snapshotFromForest,
  snapshotFromRoot,
  TreeNode,
  wrongTargetStep
} from './helpers';

export abstract class TreeBase implements Structure {
  public abstract kind: StructureKind;
  public id: ID;
  protected root: TreeNode | null;

  constructor(id: ID, initial?: TreeNode | null) {
    this.id = id;
    this.root = initial ?? null;
  }

  snapshot(): StateSnapshot {
    return snapshotFromRoot(this.id, this.root);
  }

  reset(): void {
    this.root = null;
  }

  resetFromSnapshot(snapshot: StateSnapshot): void {
    this.root = snapshot.nodes.length === 0 ? null : restoreTreeFromSnapshot(this.id, snapshot);
  }

  protected abstract handleOperation(op: Operation): OpStep | OpStep[] | null;

  *apply(op: Operation): Iterable<OpStep> {
    if ((op.kind === 'Create' ? op.id : op.target) !== this.id) {
      yield wrongTargetStep(op, this.id, this.snapshot());
      return;
    }
    const result = this.handleOperation(op);
    if (!result) return;
    const steps = Array.isArray(result) ? result : [result];
    for (const step of steps) {
      yield step;
    }
  }

  protected createFromPayload(op: Operation): OpStep | null {
    if (op.kind !== 'Create') return null;
    if (op.structure && op.structure !== this.kind) {
      return this.errorStep('kind_mismatch', `Cannot create ${op.structure} on ${this.kind}`);
    }
    if (op.payload && !isValueArray(op.payload)) {
      return this.errorStep('invalid_payload', 'Create payload must be an array of numbers/strings');
    }
    const values = isValueArray(op.payload) ? op.payload : [];
    this.root = values.length ? buildFromLevelOrder(this.id, values) : null;
    const snapshot = this.snapshot();
    return {
      explain: `Create ${this.kind}`,
      events: snapshot.nodes.length ? [...eventsForSnapshot(snapshot), tipEvent(`Created ${this.kind}`)] : [],
      snapshot
    };
  }

  protected errorStep(code: string, message: string): OpStep {
    return { events: [{ type: 'Tip', text: message }], snapshot: this.snapshot(), error: { code, message } };
  }
}
