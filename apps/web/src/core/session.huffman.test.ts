import { describe, expect, it } from 'vitest';
import { SessionImpl } from './session';

describe('Session Huffman demo', () => {
  it('creates Huffman structure when BuildHuffman called via demo sequence', () => {
    const session = new SessionImpl();
    session.executeOperation({ kind: 'Create', id: 'HUF', structure: 'Huffman' });
    const steps = session.executeOperation({ kind: 'BuildHuffman', target: 'HUF', weights: { a: 1, b: 2 } });
    expect(steps.length).toBeGreaterThan(0);
    expect(session.getTimeline().entries.length).toBe(2);
  });
});
