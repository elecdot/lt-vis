import { describe, expect, it, vi } from 'vitest';
import type { OpStep } from '@ltvis/shared';
import { createRenderer } from '../viz/engine';
import { createEmptyTimeline, appendEntry } from './timeline';
import { createPlaybackController } from './playback';

const steps: OpStep[] = [
  { events: [{ type: 'CreateNode', node: { id: 'n1', label: '1' } }], snapshot: { nodes: [{ id: 'n1', label: '1' }], edges: [] } },
  { events: [{ type: 'Tip', text: 'tip', anchor: 'n1' }], snapshot: { nodes: [{ id: 'n1', label: '1' }], edges: [], meta: { selection: 'n1' } } }
];

describe('PlaybackController', () => {
  it('plays forward and updates renderer state', async () => {
    let tl = createEmptyTimeline();
    tl = appendEntry(tl, { steps });
    const renderer = createRenderer();
    const controller = createPlaybackController(renderer, () => tl, (snap) => renderer.reset(snap));
    vi.useFakeTimers();
    const playPromise = controller.play();
    await vi.runAllTimersAsync();
    await playPromise;
    expect(renderer.getState().nodes.has('n1')).toBe(true);
  });

  it('stepBack replays from snapshot when available', () => {
    let tl = createEmptyTimeline();
    tl = appendEntry(tl, { steps });
    const renderer = createRenderer();
    const controller = createPlaybackController(renderer, () => tl, (snap) => renderer.reset(snap));
    renderer.applyStep(steps[0], 0);
    renderer.applyStep(steps[1], 1);
    controller.jumpTo(1);
    controller.stepBack();
    expect(renderer.getState().nodes.has('n1')).toBe(true);
  });

  it('onStepApplied fires for each step during play', async () => {
    let tl = createEmptyTimeline();
    tl = appendEntry(tl, { steps });
    const renderer = createRenderer();
    const onStepApplied = vi.fn();
    const controller = createPlaybackController(renderer, () => tl, (snap) => renderer.reset(snap), { onStepApplied });
    vi.useFakeTimers();
    const playPromise = controller.play();
    await vi.runAllTimersAsync();
    await playPromise;
    expect(onStepApplied).toHaveBeenCalledTimes(steps.length);
  });
});
