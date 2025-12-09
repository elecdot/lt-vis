import type { ID, OpStep, StateSnapshot, VizEvent } from '@ltvis/shared';
import type { EdgeViewState, NodeViewState, PlaybackOptions, Renderer, ViewState } from './types';
import { layoutLinear, layoutTree } from './layout';

export const createEmptyViewState = (): ViewState => ({
  nodes: new Map(),
  edges: new Map(),
  meta: {}
});

const cloneState = (snapshot?: StateSnapshot): ViewState => {
  if (!snapshot) return createEmptyViewState();
  const view = createEmptyViewState();
  snapshot.nodes.forEach((node) => view.nodes.set(node.id, { ...node }));
  snapshot.edges.forEach((edge) => view.edges.set(edge.id, { ...edge }));
  view.meta.selection = snapshot.meta?.selection ?? null;
  view.meta.stepIndex = snapshot.meta?.step;
  return view;
};

const hasTreeEdges = (state: ViewState) => Array.from(state.edges.values()).some((e) => e.label === 'L' || e.label === 'R');

const autoLayout = (state: ViewState, smooth = true): void => {
  const prevPositions = new Map<string, { x?: number; y?: number }>();
  state.nodes.forEach((n) => prevPositions.set(n.id, { x: n.x, y: n.y }));
  const laidOut = hasTreeEdges(state) ? layoutTree(state) : layoutLinear(state);
  laidOut.nodes.forEach((node, id) => {
    if (node.pinned) return;
    const prev = prevPositions.get(id);
    if (smooth && prev && prev.x !== undefined && prev.y !== undefined) {
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const x = node.x !== undefined && prev.x !== undefined ? lerp(prev.x, node.x, 0.7) : node.x;
      const y = node.y !== undefined && prev.y !== undefined ? lerp(prev.y, node.y, 0.7) : node.y;
      laidOut.nodes.set(id, { ...node, x, y });
    } else {
      laidOut.nodes.set(id, { ...node });
    }
  });
};

export const applyEvent = (state: ViewState, event: VizEvent): void => {
  switch (event.type) {
    case 'CreateNode': {
      state.nodes.set(event.node.id, { ...event.node });
      return;
    }
    case 'RemoveNode': {
      state.nodes.delete(event.id);
      // prune edges attached to the node
      for (const [edgeId, edge] of Array.from(state.edges.entries())) {
        if (edge.src === event.id || edge.dst === event.id) state.edges.delete(edgeId);
      }
      return;
    }
    case 'Link': {
      state.edges.set(event.edge.id, { ...event.edge });
      return;
    }
    case 'Unlink': {
      if (event.id) {
        state.edges.delete(event.id);
        return;
      }
      for (const [edgeId, edge] of Array.from(state.edges.entries())) {
        if ((event.src && edge.src === event.src) || (event.dst && edge.dst === event.dst)) {
          state.edges.delete(edgeId);
        }
      }
      return;
    }
    case 'Move': {
      const node = state.nodes.get(event.id);
      if (node) {
        state.nodes.set(event.id, { ...node, x: event.x, y: event.y });
      }
      return;
    }
    case 'Highlight': {
      const target = event.target;
      if (target.kind === 'node') {
        const node = state.nodes.get(target.id);
        if (node) state.nodes.set(target.id, { ...node, highlighted: true });
      } else {
        const edge = state.edges.get(target.id);
        if (edge) state.edges.set(target.id, { ...edge, highlighted: true });
      }
      return;
    }
    case 'Compare': {
      state.meta.currentTip = `Compare ${event.a} vs ${event.b}`;
      return;
    }
    case 'Swap': {
      const a = state.nodes.get(event.a);
      const b = state.nodes.get(event.b);
      if (a && b) {
        state.nodes.set(event.a, { ...b, id: event.a });
        state.nodes.set(event.b, { ...a, id: event.b });
      }
      state.meta.currentTip = `Swap ${event.a} <-> ${event.b}`;
      return;
    }
    case 'Rotate':
    case 'Rebalance': {
      state.meta.currentTip = event.type;
      return;
    }
    case 'Tip': {
      state.meta.currentTip = event.text;
      state.meta.selection = event.anchor ?? state.meta.selection ?? null;
      return;
    }
    default:
      return;
  }
};

export const applyStep = (state: ViewState, step: OpStep, idx = 0, options?: { autoLayout?: boolean; smooth?: boolean }): void => {
  step.events.forEach((evt) => applyEvent(state, evt));
  if (step.snapshot) {
    state.meta.selection = step.snapshot.meta?.selection ?? state.meta.selection ?? null;
  }
  state.meta.stepIndex = idx;
  state.meta.explain = step.explain;
  if (step.explain && !state.meta.currentTip) {
    state.meta.currentTip = step.explain;
  }
  if (options?.autoLayout !== false) {
    autoLayout(state, options?.smooth ?? true);
  }
};

export const applySteps = (state: ViewState, steps: OpStep[]): void => {
  steps.forEach((step, idx) => applyStep(state, step, idx, { autoLayout: true }));
};

class RendererImpl implements Renderer {
  private state: ViewState = createEmptyViewState();

  getState(): ViewState {
    return this.state;
  }

  reset(snapshot?: StateSnapshot): void {
    this.state = cloneState(snapshot);
  }

  applyEvent(event: VizEvent): void {
    applyEvent(this.state, event);
  }

  applyStep(step: OpStep, idx?: number, options?: { autoLayout?: boolean; smooth?: boolean }): void {
    applyStep(this.state, step, idx, options);
  }

  async play(steps: OpStep[], options?: PlaybackOptions): Promise<void> {
    const delay = options?.delayMs ?? 0;
    for (let i = 0; i < steps.length; i++) {
      this.applyStep(steps[i], i, { autoLayout: true, smooth: options?.smooth ?? true });
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

export const createRenderer = (snapshot?: StateSnapshot): Renderer => {
  const renderer = new RendererImpl();
  if (snapshot) renderer.reset(snapshot);
  return renderer;
};
