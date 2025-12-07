import type { ID, Structure, StructureKind } from '@ltvis/shared';
import { LinkedList } from './list/LinkedList';
import { SeqList } from './list/SeqList';
import { Stack } from './list/Stack';
import { BinaryTree } from './tree/BinaryTree';
import { BST } from './tree/BST';

export { SeqList, LinkedList, Stack, BinaryTree, BST };

export function createStructure(kind: StructureKind, id: ID, initial?: Array<string | number>): Structure {
  switch (kind) {
    case 'SeqList':
      return new SeqList(id, initial);
    case 'LinkedList':
      return new LinkedList(id, initial);
    case 'Stack':
      return new Stack(id, initial);
    case 'BinaryTree':
      return new BinaryTree(id, initial);
    case 'BST':
      return new BST(id, initial);
    default:
      throw new Error(`createStructure: unsupported kind ${kind}`);
  }
}

// Placeholder for Huffman to be added next
