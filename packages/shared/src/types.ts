// Shared type contracts for LT-Vis (align with CONTEXT/domain/request.md §8.1)
export type ID = string;

export interface NodeState {
  id: ID;
  label?: string;
  value?: number | string;
  x?: number;
  y?: number;
  pinned?: boolean;
  props?: Record<string, unknown>;
}

export interface EdgeState {
  id: ID;
  src: ID;
  dst: ID;
  label?: string;
  props?: Record<string, unknown>;
}

export interface StateSnapshot {
  nodes: NodeState[];
  edges: EdgeState[];
  meta?: {
    step?: number;
    selection?: ID | null;
    [k: string]: unknown;
  };
}

export type VizEvent =
  | { type: 'CreateNode'; node: NodeState }
  | { type: 'RemoveNode'; id: ID }
  | { type: 'Link'; edge: EdgeState }
  | { type: 'Unlink'; id?: ID; src?: ID; dst?: ID }
  | { type: 'Move'; id: ID; x: number; y: number }
  | { type: 'Highlight'; target: { kind: 'node' | 'edge'; id: ID }; style?: Record<string, unknown> | string }
  | { type: 'Compare'; a: ID; b: ID }
  | { type: 'Swap'; a: ID; b: ID }
  | { type: 'Rotate'; kind: 'LL' | 'RR' | 'LR' | 'RL'; pivot: ID; info?: Record<string, unknown> }
  | { type: 'Rebalance'; info?: Record<string, unknown> }
  | { type: 'Tip'; text: string; anchor?: ID };

export interface OpStep {
  events: VizEvent[];
  explain?: string;
  snapshot?: Partial<StateSnapshot>;
  error?: { code: string; message: string; detail?: unknown };
}

export type StructureKind = 'SeqList' | 'LinkedList' | 'Stack' | 'BinaryTree' | 'BST' | 'Huffman';

export type Operation =
  | { kind: 'Create'; id: ID; structure: StructureKind; payload?: unknown }
  | { kind: 'Insert'; target: ID; pos?: number; value?: number | string }
  | { kind: 'Delete'; target: ID; key?: number | string; pos?: number }
  | { kind: 'Find'; target: ID; key: number | string }
  | { kind: 'Traverse'; target: ID; order: 'preorder' | 'inorder' | 'postorder' | 'levelorder' }
  | { kind: 'Attach'; target: ID; parent: ID; child: ID; side: 'left' | 'right' }
  | { kind: 'Push'; target: ID; value: number | string }
  | { kind: 'Pop'; target: ID }
  | { kind: 'BuildHuffman'; target: ID; weights: Record<string, number> };

export interface Structure {
  kind: StructureKind;
  id: ID;
  snapshot(): StateSnapshot;
  resetFromSnapshot(snapshot: StateSnapshot): void;
  apply(op: Operation): Iterable<OpStep>;
}

export interface ProjectJSON {
  meta: {
    version: string;
    createdAt: string;
    savedAt: string;
    title?: string;
    notes?: string;
  };
  structures: Array<{ id: string; kind: StructureKind; snapshot: StateSnapshot }>;
  timeline: Array<{
    id: number;
    label?: string;
    opMeta?: unknown;
    steps: OpStep[];
  }>;
  layout: {
    nodes: Record<
      ID,
      {
        x: number;
        y: number;
        pinned?: boolean;
      }
    >;
    viewport?: { x: number; y: number; zoom: number };
  };
  ui?: {
    selectedStructureId?: string;
    theme?: 'light' | 'dark';
  };
}

export interface PersistenceService {
  saveProject(project: ProjectJSON): Promise<void>;
  loadProject(id: string): Promise<ProjectJSON>;
  listProjects(): Promise<Array<{ id: string; name?: string; createdAt?: string; updatedAt?: string }>>;
}
