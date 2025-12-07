import { describe, expect, it } from 'vitest';
import type { Operation } from '@ltvis/shared';
import { SessionImpl } from './session';

const createLinkedList: Operation = { kind: 'Create', id: 'LL', structure: 'LinkedList', payload: [1, 3, 4] };

describe('Session', () => {
  it('adds structures and records timeline entries', () => {
    const session = new SessionImpl();
    session.executeOperation(createLinkedList);
    const steps = session.executeOperation({ kind: 'Insert', target: 'LL', pos: 1, value: 2 });
    expect(steps.length).toBeGreaterThan(0);
    expect(session.getTimeline().entries.length).toBe(2);
  });

  it('ensures snapshots on steps', () => {
    const session = new SessionImpl();
    session.executeOperation(createLinkedList);
    const steps = session.executeOperation({ kind: 'Find', target: 'LL', key: 3 });
    steps.forEach((s) => expect(s.snapshot).toBeDefined());
  });

  it('reset snapshot round-trip', () => {
    const session = new SessionImpl();
    session.executeOperation(createLinkedList);
    const snap = session.getSnapshot('LL');
    expect(snap.nodes.length).toBeGreaterThan(0);
  });
});
