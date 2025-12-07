import type { ID, Structure, StructureKind } from '@ltvis/shared';
import { LinkedList } from './list/LinkedList';
import { SeqList } from './list/SeqList';
import { Stack } from './list/Stack';

export { SeqList, LinkedList, Stack };

export function createStructure(kind: StructureKind, id: ID, initial?: Array<string | number>): Structure {
  switch (kind) {
    case 'SeqList':
      return new SeqList(id, initial);
    case 'LinkedList':
      return new LinkedList(id, initial);
    case 'Stack':
      return new Stack(id, initial);
    default:
      throw new Error(`createStructure: unsupported kind ${kind}`);
  }
}

// Placeholders for future Phase 2 structures
// export { BinaryTree } from './tree/BinaryTree';
// export { BST } from './tree/BST';
// export { HuffmanTree } from './tree/HuffmanTree';
