Nice, this is the fun part. Let’s zoom into **Phase 3 — Renderer & Layout** in the same style as Phase 2.

---

## 3. Phase 3 — Renderer & Layout (Detailed Roadmap)

### 3.0 Goals (what Phase 3 must achieve)

By the end of Phase 3, you should have:

- A **pure, idempotent event executor** that can apply `VizEvent` sequences to a view state.
    
- A **layout engine** that positions nodes for:
    
    - Linear structures: SeqList, LinkedList, Stack.
        
    - Trees: BinaryTree, BST, Huffman.
        
- A minimal but working **React Flow canvas** that:
    
    - Renders nodes/edges from `ViewState`.
        
    - Can show static animations from a precomputed `OpStep[]` (e.g. the BST and linked-list examples).
        
- No dependency on the “Session” or “timeline engine” yet; this is **Renderer-only**.
    

This corresponds mainly to **M-06** and the “Renderer + Layout” part of DESIGN.md.

---

## 3.1 Cross-cutting Design Decisions (do this before coding)

**Goals**

- Lock core Renderer API + internal state shape.
    
- Make it easy to test Renderer headlessly (no React).
    
- Renderer/layout own all positions/animations; model snapshots omit coordinates for non-pinned nodes and supply topology only.
    

**Work items**

1. **Define Renderer’s core contracts in `apps/web/src/viz/types.ts`**
    
    Something along these lines (align with DESIGN):
    
    ```ts
    import { VizEvent, OpStep, StateSnapshot } from "@ltvis/shared";
    
    export interface NodeViewState {
      id: string;
      x: number;
      y: number;
      label: string;
      pinned?: boolean;
      highlighted?: boolean;
      selected?: boolean;
      props?: Record<string, unknown>;
    }
    
    export interface EdgeViewState {
      id: string;
      source: string;
      target: string;
      label?: string;
      highlighted?: boolean;
      props?: Record<string, unknown>;
    }
    
    export interface ViewState {
      nodes: Map<string, NodeViewState>;
      edges: Map<string, EdgeViewState>;
      meta: {
        stepIndex?: number;
        currentTip?: string;
        structureKind?: string;
        [k: string]: unknown;
      };
    }
    
    export interface PlaybackOptions {
      speed?: number; // multiplier
      onStepApplied?: (view: ViewState, step: OpStep) => void;
    }
    
    export interface Renderer {
      getState(): ViewState;
      reset(snapshot?: StateSnapshot): void;
      applyEvent(e: VizEvent): void;
      play(steps: OpStep[], options?: PlaybackOptions): Promise<void>;
    }
    ```
    
2. **Immutability vs mutability**
    
    - Internally, you can **mutate** `ViewState` for performance.
        
    - Externally (React), you’ll project `ViewState` → immutable data for React Flow.
        
3. **Idempotence rule**
    
    - `applyEvent(state, e)` must be **idempotent**:
        
        - Applying same event twice → same final `ViewState` as applying once.
            
        - Drive this with “upsert/merge” semantics (not “blind add”).
            
4. **ID mapping convention**
    
    - Renderer uses the **same IDs** as model snapshots where possible.
        
    - For edges, define a canonical pattern, e.g. `${parentId}->${childId}`.
        
5. **Forward-compat for rotations**
    
    - Keep handler/typing space ready for `Rotate`/`Rebalance` VizEvents used in Phase 8 (AVL); don’t bake in assumptions that only list/tree basics exist.
        

**Acceptance checks**

- `Renderer` interface is defined and used by at least a stub `RendererImpl` and test harness.
    
- Idempotence is explicitly tested for a few VizEvents.
    

---

## 3.2 Step 1 — Core Event Executor (headless, no UI)

### Goals

- Implement `applyEvent` + `applyOpStep` + `applySteps` as pure logic.
    
- Make Renderer testable in isolation from React.
    

### Work items

Create `apps/web/src/viz/engine.ts`:

1. **ViewState initialization**
    
    ```ts
    export function createEmptyViewState(): ViewState {
      return {
        nodes: new Map(),
        edges: new Map(),
        meta: {},
      };
    }
    ```
    
2. **Event handlers**
    
    Implement a **single dispatcher** (use the shared VizEvent shapes from `packages/shared`; e.g., `Highlight` uses `{ target: { kind, id } }`, not ad-hoc fields):
    
    ```ts
    import { VizEvent } from "@ltvis/shared";
    
    export function applyEvent(state: ViewState, event: VizEvent): ViewState {
      switch (event.type) {
        case "CreateNode": return applyCreateNode(state, event);
        case "RemoveNode": return applyRemoveNode(state, event);
        case "Link":       return applyLink(state, event);
        case "Unlink":     return applyUnlink(state, event);
        case "Move":       return applyMove(state, event);
        case "Highlight":  return applyHighlight(state, event);
        case "Compare":    return applyCompare(state, event);
        case "Swap":       return applySwap(state, event);
        case "Rotate":     return applyRotate(state, event);
        case "Rebalance":  return applyRebalance(state, event);
        case "Tip":        return applyTip(state, event);
        default:
          return state;
      }
    }
    ```
    
    Each `applyXxx` should:
    
    - Update existing node/edge if present, or create as needed (for idempotence).
        
    - Never assume initial presence: “missing → create (if logical), present → update”.
        
    
    Examples:
    
    ```ts
    function applyCreateNode(state: ViewState, e: CreateNodeEvent): ViewState {
      const node = state.nodes.get(e.id) ?? {
        id: e.id,
        x: e.x ?? 0,
        y: e.y ?? 0,
        label: e.label ?? "",
        props: {},
      };
      node.label = e.label ?? node.label;
      if (e.props) node.props = { ...node.props, ...e.props };
      if (typeof e.x === "number") node.x = e.x;
      if (typeof e.y === "number") node.y = e.y;
      state.nodes.set(e.id, node);
      return state;
    }
    
    function applyMove(state: ViewState, e: MoveEvent): ViewState {
      const node = state.nodes.get(e.id);
      if (!node) return state; // idempotent: ignore
      node.x = e.x;
      node.y = e.y;
      return state;
    }
    ```
    
3. **OpStep application**
    
    ```ts
    import { OpStep } from "@ltvis/shared";
    
    export function applyStep(state: ViewState, step: OpStep, index: number): ViewState {
      step.events.forEach(e => applyEvent(state, e));
      if (step.explain) state.meta.currentTip = step.explain;
      state.meta.stepIndex = index;
      return state;
    }
    
    export function applySteps(state: ViewState, steps: OpStep[]): ViewState {
      steps.forEach((step, i) => applyStep(state, step, i));
      return state;
    }
    ```
    
4. **Tests for engine**
    
    - Create a small test suite in `apps/web/src/viz/engine.test.ts`:
        
        - `CreateNode` then `Move` → node has final coordinates.
            
        - Applying same `CreateNode` twice doesn’t duplicate or change unexpectedly.
            
        - `Link` / `Unlink` produce edges with correct IDs and endpoints.
            
        - `Highlight` only flips flags, no structural changes.
            

### Acceptance checks

- Engine functions are **framework-free** (no React).
    
- Idempotence tests pass for all core event types.
    
- `applySteps` can consume an OpStep[] from Phase 2 tests and produce a sensible `ViewState` (checked via snapshot tests).
    

---

## 3.3 Step 2 — Mapping ViewState → React Flow

### Goals

- Convert internal `ViewState` into the objects React Flow expects.
    
- Keep mapping logic separate from core engine to keep it testable.
    

### Work items

Create `apps/web/src/viz/reactflow-adapter.ts`:

1. **Define mapping functions**
    
    ```ts
    import { Node, Edge } from "reactflow";
    import { ViewState, NodeViewState, EdgeViewState } from "./types";
    
    export function toReactFlowNodes(view: ViewState): Node[] {
      return Array.from(view.nodes.values()).map(nodeToRF);
    }
    
    function nodeToRF(n: NodeViewState): Node {
      return {
        id: n.id,
        position: { x: n.x, y: n.y },
        data: {
          label: n.label,
          highlighted: n.highlighted,
          selected: n.selected,
          props: n.props,
        },
        draggable: !n.pinned,
        // use a custom type if needed, e.g. "ds-node"
        type: "ds-node",
      };
    }
    
    export function toReactFlowEdges(view: ViewState): Edge[] {
      return Array.from(view.edges.values()).map(edgeToRF);
    }
    
    function edgeToRF(e: EdgeViewState): Edge {
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        data: e.props,
        type: "smoothstep",
      };
    }
    ```
    
2. **Canvas component**
    
    - `apps/web/src/components/DemoCanvas.tsx`:
        
        ```tsx
        import React from "react";
        import ReactFlow, { Background, Controls } from "reactflow";
        import { toReactFlowNodes, toReactFlowEdges } from "../viz/reactflow-adapter";
        
        export function DemoCanvas({ viewState }: { viewState: ViewState }) {
          const nodes = React.useMemo(() => toReactFlowNodes(viewState), [viewState]);
          const edges = React.useMemo(() => toReactFlowEdges(viewState), [viewState]);
        
          return (
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Background />
              <Controls />
            </ReactFlow>
          );
        }
        ```
        
3. **Wire to a simple demo page**
    
    - `apps/web/src/pages/RendererDemo.tsx`:
        
        - Imports a static `OpStep[]` (e.g. from `examples`).
            
        - Uses `createEmptyViewState` + `applySteps`.
            
        - Renders `DemoCanvas`.
            

### Acceptance checks

- Running `pnpm dev` and visiting `/renderer-demo` shows:
    
    - A static layout for a small linked list or BST.
        
    - Node labels and edges are present and correctly connected.
        
- No React Flow logic leaks into `engine.ts` (clean separation).
    

---

## 3.4 Step 3 — Layout Engine (Linear & Tree)

### Goals

- Implement a **LayoutEngine** that can:
    
    - Place list/stack nodes along a line.
        
    - Place tree nodes in a tree layout.
        
- Respect `pinned` nodes (user-dragged) by not overriding their positions.
    

### Work items

Create `apps/web/src/viz/layout.ts`:

1. **Define layout API**
    
    ```ts
    import { ViewState } from "./types";
    
    export interface LayoutOptions {
      direction?: "horizontal" | "vertical";
      nodeSpacing?: number;
      levelSpacing?: number;
    }
    
    export function layoutLinear(view: ViewState, opts?: LayoutOptions): ViewState { ... }
    
    export function layoutTree(view: ViewState, opts?: LayoutOptions): ViewState { ... }
    ```
    
2. **Linear layout (`layoutLinear`)**
    
    - Input: `ViewState` with nodes belonging to a single linear structure.
        
    - Approach:
        
        - Determine an ordering, e.g. by `props.index` (from model snapshot).
            
        - For each node:
            
            - If `node.pinned`, skip.
                
            - Else, assign `x`/`y` based on index:
                
                - Horizontal list: `x = index * (nodeSpacing)`, `y = 0`.
                    
                - Stack: maybe vertical: `x = 0`, `y = -index * nodeSpacing`.
                    
    - Call `layoutLinear` after major **structural changes**, not every minor event.
        
3. **Tree layout (`layoutTree`)**
    
    - Use `d3-hierarchy` or `elkjs` to compute positions:
        
        - First, build an internal tree structure from `nodes` and `edges`.
            
        - Run layout lib to get coordinates.
            
        - Apply to nodes, except pinned ones.
            
    - Keep the API simple: for now support one root tree per `ViewState`.
        
4. **Integration with engine**
    
    - Provide **helper functions** that combine layout with events:
        
        - For example, when `Model` emits a `Rebalance` or major `CreateNode` events, append a `Move` event for each node based on layout result.
            
        - In Phase 3, a simpler path is fine: run `layoutLinear/tree` manually in demo after `applySteps`.
            
5. **Tests**
    
    - For small examples (≤ 15 nodes):
        
        - Assert nodes are non-overlapping and sorted according to index or inorder position.
            
        - For tree layout, verify parent is always above children (e.g. `y_parent < y_child`).
            

### Acceptance checks

- `layoutLinear` and `layoutTree` work for canonical examples:
    
    - `[1,2,3,4]` list → four nodes in a neat row.
        
    - A small BST with 7 nodes → balanced-looking tree.
        
- Pinned nodes remain at their last manual position when layout is reapplied.
    

---

## 3.5 Step 4 — Simple Animation Scheduler (Renderer-side)

> Timeline/controller will be handled in Phase 4, but Renderer should be able to “play” events with timing.

### Goals

- Allow `Renderer.play(steps, options)` to animate through an `OpStep[]`.
    
- Implement basic speed control (multiplier).
    

### Work items

In `engine.ts`:

1. **Implement `RendererImpl`**
    
    ```ts
    export class RendererImpl implements Renderer {
      private state: ViewState = createEmptyViewState();
    
      getState(): ViewState {
        return this.state;
      }
    
      reset(snapshot?: StateSnapshot): void {
        this.state = createEmptyViewState();
        // TODO: optionally use snapshot to seed nodes/edges.
      }
    
      applyEvent(e: VizEvent): void {
        applyEvent(this.state, e);
      }
    
      async play(steps: OpStep[], options?: PlaybackOptions): Promise<void> {
        const baseDelay = 400; // ms
        const speed = options?.speed ?? 1;
        const delay = baseDelay / speed;
    
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          applyStep(this.state, step, i);
          options?.onStepApplied?.(this.state, step);
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    ```
    
    - This is intentionally simple; Phase 4 will bring a full state machine.
        
2. **Animation demo**
    
    - On `RendererDemo` page:
        
        - Add “Play” button.
            
        - When pressed, call `renderer.play(exampleSteps, { onStepApplied: setViewState })`.
            
3. **Tests**
    
    - Minimal tests for `play` with fake timers:
        
        - “Play 3 steps” → `applyStep` called 3 times in order.
            
        - Speed multiplier affects delay.
            

### Acceptance checks

- Demo page can animate through the BST or linked list example with visible updates.
    
- `Renderer.play` remains independent of timeline/session logic.
    

---

## 3.6 Step 5 — Dev Tools & Inspection (Optional but Very Helpful)

### Goals

- Make it easy to debug OpStep → VizEvent → ViewState flow.
    
- Provide visual feedback to developers during Phase 4/5 work.
    

### Work items

1. **Debug panel component**
    
    - Show:
        
        - Current `stepIndex`.
            
        - `currentTip`.
            
        - List of nodes with (id, label, x, y).
            
        - List of edges (source, target).
            
2. **Toggle “show IDs” / “show props” modes**
    
    - Node labels can switch between:
        
        - `value` (user-friendly).
            
        - `[id] value` (debug mode).
            
3. **JSON export button**
    
    - Dump current `ViewState` to JSON for quick inspection and for comparing with tests.
        

### Acceptance checks

- Developers can quickly inspect whether events/layout are working correctly without digging into the console.
    
- Any regression in Renderer behavior can be reproduced visually from stored `OpStep[]`.
    

---

## 3.7 Phase 3 Done-ness Checklist

Use this as the final gate before moving to Session/timeline (Phase 4):

-  `ViewState`, `NodeViewState`, `EdgeViewState`, `Renderer` interfaces defined and shared.
    
-  `applyEvent` implemented and **idempotent** for all core VizEvents.
    
-  `applyStep` / `applySteps` can consume real `OpStep[]` from Phase 2 examples.
    
-  React Flow adapter exists and is the only place that knows about React Flow types.
    
-  `layoutLinear` and `layoutTree` position nodes sensibly for:
    
    -  The linked-list example.
        
    -  The BST deletion example.
        
    -  The Huffman tree example.
        
-  Simple `RendererDemo` page:
    
    -  Renders static final states.
        
    -  Can animate `OpStep[]` through `Renderer.play`.
        
-  Basic tests:
    
    -  Idempotence for `CreateNode`, `Link`, `Unlink`, `Move`, `Highlight`, `Tip`.
        
    -  Layout non-overlap and parent/child ordering.
        
-  No cyclic dependency between:
    
    - `packages/model-ts` ↔ `apps/web/src/viz/*` (Renderer only depends on shared types).
        
