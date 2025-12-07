import { describe, expect, it } from 'vitest';
import { demoOperations, demoStep } from './demoData';

describe('web demo data', () => {
  it('provides at least one operation and a snapshot-bearing step', () => {
    expect(demoOperations.length).toBeGreaterThan(0);
    expect(demoStep.snapshot.nodes.length).toBeGreaterThan(0);
    expect(demoStep.events[0]?.type).toBe('Tip');
  });

  it('keeps selection aligned to inserted node', () => {
    const selection = demoStep.snapshot.meta?.selection;
    expect(selection).toBe('DemoList:1');
    const exists = demoStep.snapshot.nodes.some((n) => n.id === selection);
    expect(exists).toBe(true);
  });
});
