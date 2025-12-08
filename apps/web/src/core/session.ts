import type { Operation, OpStep, StateSnapshot, StructureKind } from '@ltvis/shared';
import { createStructure } from '@ltvis/model-ts';
import type { TimelineState } from './timeline';
import { appendEntry, createEmptyTimeline } from './timeline';

export interface Session {
  addStructure(kind: StructureKind, id: string, payload?: unknown): void;
  executeOperation(op: Operation): OpStep[];
  getSnapshot(id: string): StateSnapshot;
  getTimeline(): TimelineState;
}

export class SessionImpl implements Session {
  private structures = new Map<string, ReturnType<typeof createStructure>>();
  private timeline: TimelineState = createEmptyTimeline();

  addStructure(kind: StructureKind, id: string, payload?: unknown): void {
    const structure = createStructure(kind, id, Array.isArray(payload) ? payload : undefined);
    this.structures.set(id, structure);
    const steps = Array.from(structure.apply({ kind: 'Create', id, structure: kind, payload }));
    this.appendSteps(steps, `Create ${kind}`);
  }

  executeOperation(op: Operation): OpStep[] {
    if (op.kind === 'Create') {
      this.addStructure(op.structure, op.id, op.payload);
      return this.timeline.entries[this.timeline.entries.length - 1]?.steps ?? [];
    }

    if (!('target' in op)) {
      throw new Error('Operation missing target');
    }
    const target = op.target;
    let structure = this.structures.get(target);
    if (!structure && op.kind === 'BuildHuffman') {
      this.addStructure('Huffman', target);
      structure = this.structures.get(target);
    }
    if (!structure) throw new Error(`Structure ${target} not found`);
    const steps = Array.from(structure.apply(op));
    const withSnapshots = steps.map((s) => (s.snapshot ? s : { ...s, snapshot: structure.snapshot() }));
    this.appendSteps(withSnapshots, op.kind);
    return withSnapshots;
  }

  getSnapshot(id: string): StateSnapshot {
    const structure = this.structures.get(id);
    if (!structure) throw new Error(`Structure ${id} not found`);
    const snap = structure.snapshot();
    // reset timeline and structure for a clean start
    structure.reset();
    structure.resetFromSnapshot(snap);
    this.timeline = createEmptyTimeline();
    return snap;
  }

  getTimeline(): TimelineState {
    return this.timeline;
  }

  private appendSteps(steps: OpStep[], label?: string, opMeta?: unknown) {
    this.timeline = appendEntry(this.timeline, { steps, label, opMeta });
  }
}
