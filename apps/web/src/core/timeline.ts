import type { OpStep } from '@ltvis/shared';

export interface TimelineEntry {
  id: number;
  steps: OpStep[];
  label?: string;
  opMeta?: unknown;
}

export interface TimelineState {
  entries: TimelineEntry[];
  currentStepIndex: number;
  totalSteps: number;
}

export const createEmptyTimeline = (): TimelineState => ({
  entries: [],
  currentStepIndex: -1,
  totalSteps: 0
});

export const appendEntry = (state: TimelineState, entry: Omit<TimelineEntry, 'id'>): TimelineState => {
  const id = state.entries.length > 0 ? state.entries[state.entries.length - 1].id + 1 : 0;
  const newEntry: TimelineEntry = { id, ...entry };
  return {
    entries: [...state.entries, newEntry],
    totalSteps: state.totalSteps + entry.steps.length,
    currentStepIndex: state.totalSteps + entry.steps.length - 1
  };
};

export const flattenSteps = (state: TimelineState): OpStep[] => state.entries.flatMap((e) => e.steps);

export const canStepForward = (state: TimelineState): boolean => state.currentStepIndex < state.totalSteps - 1;
export const canStepBack = (state: TimelineState): boolean => state.currentStepIndex > 0;

export const stepForward = (state: TimelineState): TimelineState => {
  if (!canStepForward(state)) return state;
  return { ...state, currentStepIndex: state.currentStepIndex + 1 };
};

export const stepBack = (state: TimelineState): TimelineState => {
  if (!canStepBack(state)) return state;
  return { ...state, currentStepIndex: state.currentStepIndex - 1 };
};

export const jumpTo = (state: TimelineState, index: number): TimelineState => {
  if (index < 0) index = 0;
  if (index > state.totalSteps - 1) index = state.totalSteps - 1;
  return { ...state, currentStepIndex: index };
};
