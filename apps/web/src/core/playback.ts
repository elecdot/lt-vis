import type { OpStep, StateSnapshot } from '@ltvis/shared';
import type { Renderer } from '../viz/types';
import { applyStep } from '../viz/engine';
import type { TimelineState } from './timeline';
import { flattenSteps, jumpTo, stepBack, stepForward } from './timeline';

type PlaybackState = 'idle' | 'playing' | 'paused';

export interface PlaybackController {
  state: PlaybackState;
  currentIndex: number;
  play(steps?: OpStep[]): Promise<void>;
  pause(): void;
  stepForward(): void;
  stepBack(): void;
  jumpTo(index: number): void;
  setSpeed(multiplier: number): void;
}

export const createPlaybackController = (
  renderer: Renderer,
  timeline: () => TimelineState,
  resetToSnapshot: (snapshot: StateSnapshot) => void
): PlaybackController => {
  let status: PlaybackState = 'idle';
  let speedMultiplier = 1;
  let currentIndex = -1;
  const updateTimelineIndex = (idx: number) => {
    const tl = timeline();
    tl.currentStepIndex = idx;
  };

  const play = async (overrideSteps?: OpStep[]) => {
    status = 'playing';
    const steps = overrideSteps ?? flattenSteps(timeline());
    for (let i = 0; i < steps.length; i++) {
      if (status !== 'playing') break;
      renderer.applyStep(steps[i], i);
      currentIndex = i;
      updateTimelineIndex(i);
      const delay = 200 / speedMultiplier;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    status = 'idle';
  };

  const pause = () => {
    status = 'paused';
  };

  const doStepForward = () => {
    const tl = timeline();
    if (tl.currentStepIndex >= tl.totalSteps - 1) return;
    const nextIdx = tl.currentStepIndex + 1;
    const step = flattenSteps(tl)[nextIdx];
    renderer.applyStep(step, nextIdx);
    currentIndex = nextIdx;
    updateTimelineIndex(nextIdx);
  };

  const doStepBack = () => {
    const tl = timeline();
    if (tl.currentStepIndex <= 0) return;
    const prevIdx = tl.currentStepIndex - 1;
    const steps = flattenSteps(tl);
    const snapshot = steps[prevIdx]?.snapshot;
    if (snapshot) {
      resetToSnapshot(snapshot);
      steps.slice(0, prevIdx + 1).forEach((s, idx) => renderer.applyStep(s, idx));
      currentIndex = prevIdx;
      updateTimelineIndex(prevIdx);
      return;
    }
    // fallback: replay from zero
    renderer.reset();
    steps.slice(0, prevIdx + 1).forEach((s, idx) => renderer.applyStep(s, idx));
    currentIndex = prevIdx;
    updateTimelineIndex(prevIdx);
  };

  const doJumpTo = (index: number) => {
    const tl = timeline();
    const clamped = Math.max(0, Math.min(index, tl.totalSteps - 1));
    const steps = flattenSteps(tl);
    const snapshot = steps[clamped]?.snapshot;
    renderer.reset();
    if (snapshot) resetToSnapshot(snapshot);
    steps.slice(0, clamped + 1).forEach((s, idx) => renderer.applyStep(s, idx));
    currentIndex = clamped;
    updateTimelineIndex(clamped);
  };

  const setSpeed = (multiplier: number) => {
    speedMultiplier = Math.max(0.1, multiplier);
  };

  return {
    get state() {
      return status;
    },
    get currentIndex() {
      return currentIndex;
    },
    play,
    pause,
    stepForward: doStepForward,
    stepBack: doStepBack,
    jumpTo: doJumpTo,
    setSpeed
  };
};
