import type { EdgeState, ID, NodeState, OpStep, StateSnapshot, VizEvent } from '@ltvis/shared';

export type NodeViewState = NodeState & { highlighted?: boolean; pinned?: boolean };
export type EdgeViewState = EdgeState & { highlighted?: boolean };

export interface ViewStateMeta {
  stepIndex?: number;
  currentTip?: string;
  explain?: string;
  selection?: ID | null;
}

export interface ViewState {
  nodes: Map<ID, NodeViewState>;
  edges: Map<ID, EdgeViewState>;
  meta: ViewStateMeta;
}

export interface PlaybackOptions {
  delayMs?: number;
  smooth?: boolean;
  durationMs?: number;
}

export interface Renderer {
  getState(): ViewState;
  reset(snapshot?: StateSnapshot): void;
  applyEvent(event: VizEvent): void;
  applyStep(step: OpStep, idx?: number, options?: { autoLayout?: boolean; smooth?: boolean }): void;
  play(steps: OpStep[], options?: PlaybackOptions): Promise<void>;
}
