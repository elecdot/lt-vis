Alright, moving on to **Phase 5 — UI Shell** 🚦

We’ll assume Phases 1–4 are “conceptually done”: contracts, model, renderer, session, timeline, and command path exist and are testable headless.

---

## 5. Phase 5 — UI Shell: Panels, Canvas, Controls

### 5.0 Goals

By the end of Phase 5, you should have a **usable MVP app** for students/teachers:

- Layout: **Command Panel → Canvas → Timeline/Explain** (roughly left/center/bottom or left/center/right).
    
- Users can:
    
    - Select a structure (list / linked list / stack / BST / Huffman).
        
    - Perform basic operations through forms/buttons.
        
    - See visual animations on the canvas.
        
    - Control playback: play, pause, step, back, jump, adjust speed.
        
- UI talks **only** to the `Command` / `Session` / `Playback` layer (Phase 4), not directly to model/renderer.
    

This basically turns the back-end pipeline into a real learning tool.

---

## 5.1 Overall App Layout & State Wiring

**Goal:** Establish a top-level React layout and wiring to core services.

**Work items**

1. **App layout skeleton**
    
    In `apps/web/src/App.tsx` or a dedicated `MainPage.tsx`:
    
    - Use a simple three-region layout:
        
        ```tsx
        <div className="ltvis-app">
          <Sidebar> {/* Command Panel */} </Sidebar>
          <Main>
            <Canvas />        {/* React Flow visualization */}
            <BottomPanel>     {/* Timeline + Explain + Debug */} </BottomPanel>
          </Main>
        </div>
        ```
        
    - Use CSS grid/flex; don’t over-style yet:
        
        - Sidebar fixed width (e.g. 280–320px).
            
        - Main fills remaining space.
            
2. **Provide services via React context**
    
    Create a `CoreContext`:
    
    ```ts
    interface CoreServices {
      session: Session;
      playback: PlaybackController;
      renderer: Renderer;
      dispatch: (cmd: UICommand) => void;
      // optional: current timeline, viewState, etc.
    }
    ```
    
    - On app init:
        
        - Instantiate `SessionImpl`, `RendererImpl`, `PlaybackControllerImpl`.
            
        - Wrap the app in `CoreContext.Provider`.
            
    - `dispatch` will just call `handleUICommand`.
        
3. **Canvas state updates**
    
    - `RendererImpl` exposes `getState()`.
        
    - You need a mechanism to push renderer changes into React:
        
        - Simplest: Playback calls `onStepApplied(viewState, step)` and you store a shallow-cloned `ViewState` in React state:
            
            ```ts
            const [view, setView] = useState<ViewState>(createEmptyViewState());
            
            // Pass setView into Renderer / Playback when constructing them.
            ```
            
        - Outside playback (e.g. after direct operation), you can manually call `setView(renderer.getState())`.
            

**Acceptance criteria**

- App bootstraps without errors.
    
- Child components (command panel, canvas, bottom panel) can access `session`, `playback`, `dispatch`, and `viewState` via context.
    

---

## 5.2 Command Panel (Structure & Operation Forms)

**Goal:** Provide a clean, minimal UI for selecting structures and issuing operations.

**Work items**

1. **Structure selection**
    
    - A **dropdown** or **tabs** for structure types:
        
        - `SeqList`, `LinkedList`, `Stack`, `BinaryTree`, `BST`, `Huffman` (+ AVL later).
            
    - When user selects a structure:
        
        - Issue `UICommand { type: "CreateStructure", kind, id, payload? }`.
            
        - For MVP, use fixed IDs, e.g. `"LIST"`, `"STACK"`, `"TREE"`, `"HUFFMAN"`.
            
2. **Operation forms per structure**
    
    Implement small sub-components:
    
    - `ListControls` (used for SeqList / LinkedList):
        
        - Fields:
            
            - Initial values (e.g. comma-separated: `1,3,4`).
                
            - Insert: `index` (number), `value` (number).
                
            - Delete: `index` (number).
                
            - Find: `value` (number).
                
        - Buttons to dispatch relevant `RunOperation` commands via operation factories:
            
            - `makeListCreateOp("LIST", [1,3,4])`
                
            - `makeListInsertOp("LIST", index, value)`, etc.
                
    - `StackControls`:
        
        - Fields:
            
            - Initial values.
                
            - Push: `value`.
                
        - Buttons: Push, Pop.
            
    - `BSTControls`:
        
        - Fields:
            
            - Initial values.
                
            - Insert: `key`.
                
            - Delete: `key`.
                
            - Find: `key`.
                
        - Buttons corresponding to operations.
            
    - `HuffmanControls`:
        
        - Field: weights map (simple text format: `a=5,b=9,...`).
            
        - Button: Build Huffman.
            
3. **Command dispatch**
    
    - Each button’s `onClick`:
        
        - Validates form.
            
        - Builds typed `Operation` using Phase 4 factories.
            
        - Calls `dispatch({ type: "RunOperation", op })`.
            
        - After `RunOperation` (outside playback), refresh renderer/view state from the latest snapshots so the canvas reflects the updated structure immediately.
            
    - Optionally, after `RunOperation`, auto-scroll timeline panel to new entry index.
        
4. **Error feedback**
    
    - If `Session.executeOperation` returns an OpStep whose last item has `error`, you should:
        
        - Show an inline message near the form (e.g. “Index out of bounds”, “Key not found”).
            
        - Optionally highlight in Explain panel as well.
            

**Acceptance criteria**

- For each structure:
    
    - User can create an initial structure (e.g. `[1,3,4]`, BST from list, Huffman from map).
        
    - User can run main operations from UI; they show up in timeline and on canvas.
        
- Errors from invalid operations are visible and understandable.
    

---

## 5.3 Canvas Integration (React Flow + ViewState)

**Goal:** Make the central canvas show the current `ViewState`, and support basic interaction (pan, zoom, drag to pin).

**Work items**

1. **Canvas component**
    
    - `CanvasPanel.tsx`:
        
        ```tsx
        export function CanvasPanel() {
          const { viewState } = useCore(); // from context
          const nodes = useMemo(() => toReactFlowNodes(viewState), [viewState]);
          const edges = useMemo(() => toReactFlowEdges(viewState), [viewState]);
        
          return (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              onNodesChange={...}
              onEdgesChange={...}   // probably minimal for now
              onNodeDragStop={(evt, node) => handleNodeDragStop(node)}
            >
              <Background />
              <Controls />
            </ReactFlow>
          );
        }
        ```
        
2. **Support node dragging → `pinned`**
    
    - `onNodeDragStop` handler:
        
        - Look up corresponding `NodeViewState` in `viewState`.
            
        - Update its `x`, `y`, and set `pinned = true`.
            
        - Persist this in Renderer’s `ViewState`:
            
            - Either:
                
                - Have Renderer expose a `setNodePosition(id, x, y)` method, or
                    
                - Dispatch a synthetic `Move` VizEvent and `applyEvent`.
                    
    - Ensure layout functions respect `pinned` (Phase 3).
        
3. **Zoom & pan**
    
    - Just use React Flow defaults.
        
    - Optionally expose “Fit view” button / context menu.
        
4. **Styling differences by structure**
    
    - Node `data.props` may contain structure-specific hints (type, index, etc.).
        
    - Use `node.type` to render different visual node components (e.g. list vs tree).
        
        - But this can be deferred; MVP can reuse a single `Node` component with label + highlighted style.
            

**Acceptance criteria**

- Canvas shows up-to-date node/edge graph after operations or playback.
    
- Dragging a node updates its position and persists across subsequent layout operations.
    
- Zoom and pan feel usable on typical examples (up to 15–20 nodes).
    

---

## 5.4 Timeline Bar & Explain Panel

**Goal:** Provide clear playback controls and textual explanation per step.

**Work items**

1. **Timeline bar**
    
    - `TimelineBar.tsx`:
        
        - Shows:
            
            - Buttons: `⏮ Step Back`, `▶ Play`, `⏸ Pause`, `⏭ Step Forward`.
                
            - Slider: current step index (0..`totalSteps-1`).
                
            - Speed selector: e.g. 0.5x, 1x, 2x.
                
        - On button click:
            
            - Dispatch `UICommand` of type `Playback` with right `action`.
                
            - Example: `Playback: { action: "Play" }`.
                
        - On slider change:
            
            - Call `PlaybackController.jumpTo(index)`.
                
            - Implementation (Phase 4) replays from scratch or uses snapshots, then updates Renderer.
                
    - Timeline needs to know:
        
        - `currentStepIndex` and `totalSteps` from `TimelineState` (exposed by Session).
            
            - Expose via context: `const timeline = session.getTimeline()` (but careful about re-renders).
                
            - For MVP, recalc on each render (optimized later if needed).
                
2. **Explain panel**
    
    - `ExplainPanel.tsx`:
        
        - Displays:
            
            - `currentTip` from `viewState.meta.currentTip`.
                
            - Any `error` message of the current `OpStep` (if available).
                
            - Possibly a small list of recent tips.
                
    - When playback applies `step`, `applyStep` should set `viewState.meta.currentTip`.
        
3. **Linking timeline to entries (optional at first)**
    
    - Eventually:
        
        - Show a **timeline of operations**, not just raw steps; e.g. `Insert(2@1)` entries.
            
        - Clicking an entry could jump to the first step of that operation.
            
    - For Phase 5 MVP:
        
        - You can skip the per-entry UI and expose only “global step index” slider.
            

**Acceptance criteria**

- User can:
    
    - Play through an operation with animation.
        
    - Step forward/back per OpStep.
        
    - Move the slider to jump to any step.
        
- At each step, Explain panel shows a human-readable explanation text.
    
- If OpStep has `error`, Explain panel clearly indicates the error.
    

---

## 5.5 Demo Presets & Quick Start

**Goal:** Make it easy for a teacher or student to “see something” in under 1 minute.

**Work items**

1. **Demo presets module** (builds on Phase 4 `demos.ts`)
    
    - Define a small set of demos:
        
        - `"LL_INSERT"`:
            
            - Create linked list `[1,3,4]` and run `Insert(1,2)`.
                
        - `"BST_DELETE"`:
            
            - Create BST `[5,3,7,2,4,6,8]` and run `Delete(7)`.
                
        - `"HUFFMAN_BUILD"`:
            
            - `{a:5, b:9, c:12, d:13, e:16, f:45}`.
                
    - Each demo exports:
        
        - Structures to create (kind, id, payload).
            
        - Operation sequence.
            
2. **UI: Demo selection**
    
    - In Command Panel (top section):
        
        - Dropdown “Load demo” with options:
            
            - “Linked List Insert (1,3,4 → insert 2 at 1)”
                
            - “BST Delete (delete 7 from [5,3,7,2,4,6,8])”
                
            - “Huffman Build (classic 6 letters)”
                
        - “Load demo” button:
            
            - Dispatch `UICommand { type: "LoadDemo", demoId }`.
                
    - After demo is loaded:
        
        - Automatically update renderer to the **initial** state (before playback).
            
        - Optionally auto-open Explain panel with a short description.
            

**Acceptance criteria**

- A cold user is able to:
    
    - Select “BST Delete” demo.
        
    - Hit play.
        
    - Watch tree animation without entering any forms.
        
- All three core demos work and look reasonable on canvas.
    

---

## 5.6 Keyboard Shortcuts & Minimal UX Enhancements

**Goal:** Make playback and navigation efficient and usable in a classroom setting.

**Work items**

1. **Keyboard shortcuts**
    
    - Add a simple hook or component listening to keydown:
        
        - `Space` → toggle Play/Pause.
            
        - `ArrowRight` → Step Forward.
            
        - `ArrowLeft` → Step Back.
            
        - `Home`/`End` → Jump to start/end.
            
    - Ensure shortcuts are disabled when user is typing in input fields (stop event propagation appropriately).
        
2. **Status indicators**
    
    - Somewhere in UI (e.g., bottom right):
        
        - Show: `status: Playing/Paused/Idle`.
            
        - Show: `step: currentStepIndex / totalSteps`.
            
3. **Small affordances**
    
    - Fit-view button in canvas.
        
    - “Reset structure” button in Command Panel.
        
    - Optionally: “Restart playback from beginning” button (just `jumpTo(-1)`, then `Play`).
        

**Acceptance criteria**

- Shortcut keys do not interfere with typing in forms.
    
- Teacher can operate playback mostly via keyboard while pointing at the screen.
    

---

## 5.7 Testing & Phase 5 Done-ness Checklist

**Goal:** Ensure UI layer is stable and integrates cleanly with core logic.

**Work items**

1. **Component-level tests**
    
    - Use React Testing Library where feasible for:
        
        - Command Panel:
            
            - Filling form and clicking “Insert” triggers `RunOperation`.
                
        - TimelineBar:
            
            - Clicking step/slider updates `PlaybackController` (mocked).
                
    - Don’t over-test UI styling; focus on interactions and command dispatch.
        
2. **Manual exploratory tests**
    
    - Run through all core scenarios:
        
        - Linked list insert demo.
            
        - Manual linked list operations.
            
        - BST delete demo + manual inserts/deletes.
            
        - Huffman build demo.
            
    - Try invalid operations and confirm:
        
        - Error message.
            
        - No broken state or weird visual artifacts.
            
3. **Bug/UX backlog**
    
    - Keep a small list of observed glitches to be fixed before Phase 6 (hardening).
        

---

### Phase 5 “Done” Checklist

You can mark Phase 5 complete when:

-  Main layout with **Command Panel + Canvas + Timeline/Explain** is implemented.
    
-  Command Panel:
    
    -  Can create each core structure.
        
    -  Can trigger create/insert/delete/find/push/pop/build operations.
        
    -  Surfaces model errors clearly.
        
-  Canvas:
    
    -  Renders nodes/edges from `ViewState`.
        
    -  Nodes draggable → persisted as `pinned`.
        
    -  Zoom/pan work well.
        
-  Timeline & Explain:
    
    -  Play/Pause/StepForward/StepBack/Jump/Speed all work.
        
    -  Explain panel always shows the current step’s explanation or error.
        
-  Demo presets:
    
    -  Linked list insert, BST delete, Huffman demos load and play correctly.
        
-  Keyboard shortcuts:
    
    -  Space toggles play/pause; arrows step; they don’t interfere with typing.
        
-  No UI component talks directly to Model or Renderer internals:
    
    -  All operations go through `UICommand` / `Session` / `Playback`.
        
-  Core interaction flows feel stable enough for a classroom demo.
