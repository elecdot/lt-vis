import { describe, expect, it } from 'vitest';
import type { OpStep } from '@ltvis/shared';
import {
  appendEntry,
  canStepBack,
  canStepForward,
  createEmptyTimeline,
  flattenSteps,
  jumpTo,
  stepBack,
  stepForward
} from './timeline';

const step = (id: string): OpStep => ({ events: [{ type: 'Tip', text: id }], snapshot: { nodes: [], edges: [] } });

describe('timeline', () => {
  it('appends entries and updates totals', () => {
    let state = createEmptyTimeline();
    state = appendEntry(state, { steps: [step('a'), step('b')], label: 'first' });
    expect(state.entries.length).toBe(1);
    expect(state.totalSteps).toBe(2);
    expect(state.currentStepIndex).toBe(1);
  });

  it('can step and jump within bounds', () => {
    let state = createEmptyTimeline();
    state = appendEntry(state, { steps: [step('a'), step('b')], label: 'first' });
    expect(canStepBack(state)).toBe(true);
    expect(canStepForward(state)).toBe(false);
    state = jumpTo(state, 0);
    expect(state.currentStepIndex).toBe(0);
    state = stepForward(state);
    expect(state.currentStepIndex).toBe(1);
    state = stepBack(state);
    expect(state.currentStepIndex).toBe(0);
  });

  it('flattens steps in entry order', () => {
    let state = createEmptyTimeline();
    state = appendEntry(state, { steps: [step('a')], label: 'first' });
    state = appendEntry(state, { steps: [step('b'), step('c')], label: 'second' });
    const flat = flattenSteps(state);
    expect(flat.map((s) => (s.events[0] as any).text)).toEqual(['a', 'b', 'c']);
  });
});
