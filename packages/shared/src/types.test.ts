import { describe, expect, it, expectTypeOf } from 'vitest';
import type { OpStep, StateSnapshot } from './types';

const baseSnapshot: StateSnapshot = { nodes: [], edges: [], meta: { step: 0 } };

describe('shared contracts', () => {
  it('requires a snapshot on every OpStep', () => {
    const step: OpStep = { events: [{ type: 'Tip', text: 'demo' }], snapshot: baseSnapshot };
    expect(step.snapshot).toBeDefined();
    expect(step.events[0].type).toBe('Tip');
  });

  it('refuses an OpStep without a snapshot (type-level)', () => {
    // @ts-expect-error snapshot is mandatory
    const _invalid: OpStep = { events: [] };
    expectTypeOf(_invalid).toEqualTypeOf<OpStep>();
  });
});
