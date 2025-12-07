// Shared type contracts for LT-Vis (align with CONTEXT/domain/request.md §8.1)
/**
 * Globally unique identifier for nodes, edges, and structures.
 * Recommended format: `${StructureId}:${localId}` to avoid collisions across structures.
 */
export type ID = string;

/**
 * Visual/renderer-facing state for a single node.
 */
export interface NodeState {
  id: ID;
  label?: string;
  value?: number | string;
  x?: number;
  y?: number;
  pinned?: boolean;
  props?: Record<string, unknown>;
}

/**
 * Visual/renderer-facing state for a single edge.
 */
export interface EdgeState {
  id: ID;
  src: ID;
  dst: ID;
  label?: string;
  props?: Record<string, unknown>;
}

/**
 * Snapshot of the current structure state used for timeline playback and persistence.
 * stepBack must prefer these snapshots; replay-from-zero is only a documented fallback.
 */
export interface StateSnapshot {
  nodes: NodeState[];
  edges: EdgeState[];
  meta?: {
    step?: number;
    selection?: ID | null;
    [k: string]: unknown;
  };
}

/**
 * Rendering instructions emitted by the Model and consumed by the Renderer.
 * Events must be idempotent so reruns produce the same final ViewState.
 */
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

/**
 * A single timeline step consisting of renderer events and an accompanying snapshot.
 * error indicates the operation was rejected; the model state must remain unchanged after an error step.
 */
export interface OpStep {
  events: VizEvent[];
  explain?: string;
  snapshot: StateSnapshot;
  error?: { code: string; message: string; detail?: unknown };
}

export type StructureKind = 'SeqList' | 'LinkedList' | 'Stack' | 'BinaryTree' | 'BST' | 'Huffman';

/**
 * User-initiated actions translated by the UI/command bus into model operations.
 */
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

/**
 * Headless model contract implemented by each data structure.
 * - snapshot(): returns the current StateSnapshot for playback/persistence.
 * - reset(): clears internal state to an empty structure of the same kind.
 * - resetFromSnapshot(): restores state without replaying operations (persistence/import).
 * - apply(): executes an Operation and yields OpSteps; final step must reflect latest snapshot.
 */
export interface Structure {
  kind: StructureKind;
  id: ID;
  snapshot(): StateSnapshot;
   reset(): void;
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
