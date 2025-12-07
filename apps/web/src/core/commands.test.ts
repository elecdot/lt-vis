import { describe, expect, it, vi } from 'vitest';
import type { Operation } from '@ltvis/shared';
import { createRenderer } from '../viz/engine';
import { createPlaybackController } from './playback';
import { handleUICommand } from './commands';
import { SessionImpl } from './session';
import { createEmptyTimeline } from './timeline';

describe('commands', () => {
  it('runs operations via session', () => {
    const session = new SessionImpl();
    const renderer = createRenderer();
    const controller = createPlaybackController(renderer, () => createEmptyTimeline(), (snap) => renderer.reset(snap));
    handleUICommand(session, controller, { type: 'CreateStructure', kind: 'LinkedList', id: 'LL', payload: [1] });
    expect(session.getTimeline().entries.length).toBe(1);
    handleUICommand(session, controller, { type: 'RunOperation', op: { kind: 'Insert', target: 'LL', pos: 0, value: 2 } as Operation });
    expect(session.getTimeline().entries.length).toBe(2);
  });

  it('playback command calls controller', () => {
    const session = new SessionImpl();
    const renderer = createRenderer();
    const controller = createPlaybackController(renderer, () => createEmptyTimeline(), (snap) => renderer.reset(snap));
    const spy = vi.spyOn(controller, 'play');
    handleUICommand(session, controller, { type: 'Playback', action: 'play' });
    expect(spy).toHaveBeenCalled();
  });
});
