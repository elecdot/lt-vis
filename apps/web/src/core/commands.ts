import type { Operation, StructureKind } from '@ltvis/shared';
import type { PlaybackController } from './playback';
import type { Session } from './session';

export type UICommand =
  | { type: 'CreateStructure'; kind: StructureKind; id: string; payload?: unknown }
  | { type: 'RunOperation'; op: Operation }
  | { type: 'ResetStructure'; id: string }
  | { type: 'LoadDemo'; name: 'linked-list' | 'bst' | 'huffman' }
  | { type: 'Playback'; action: 'play' | 'pause' | 'stepForward' | 'stepBack'; index?: number; speed?: number };

const linkedListDemo: Operation[] = [
  { kind: 'Create', id: 'LL', structure: 'LinkedList', payload: [1, 3, 4] },
  { kind: 'Insert', target: 'LL', pos: 1, value: 2 }
];

const bstDemo: Operation[] = [
  { kind: 'Create', id: 'BST', structure: 'BST', payload: [5, 3, 7, 2, 4, 6, 8] },
  { kind: 'Delete', target: 'BST', key: 7 }
];

const huffmanDemo: Operation[] = [
  { kind: 'BuildHuffman', target: 'HUF', weights: { a: 5, b: 9, c: 12, d: 13, e: 16, f: 45 } }
];

export const handleUICommand = (session: Session, playback: PlaybackController, cmd: UICommand): void => {
  switch (cmd.type) {
    case 'CreateStructure':
      session.addStructure(cmd.kind, cmd.id, cmd.payload);
      return;
    case 'RunOperation':
      session.executeOperation(cmd.op);
      return;
    case 'ResetStructure':
      session.getSnapshot(cmd.id);
      return;
    case 'LoadDemo': {
      const ops =
        cmd.name === 'linked-list' ? linkedListDemo : cmd.name === 'bst' ? bstDemo : huffmanDemo;
      ops.forEach((op) => session.executeOperation(op));
      return;
    }
    case 'Playback': {
      if (cmd.action === 'play') playback.play();
      if (cmd.action === 'pause') playback.pause();
      if (cmd.action === 'stepForward') playback.stepForward();
      if (cmd.action === 'stepBack') playback.stepBack();
      if (cmd.index !== undefined) playback.jumpTo(cmd.index);
      if (cmd.speed) playback.setSpeed(cmd.speed);
      return;
    }
    default:
      return;
  }
};
