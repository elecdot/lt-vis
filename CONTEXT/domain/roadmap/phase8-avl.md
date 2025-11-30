Nice, this is a good “contained extension” phase. Let’s zoom into **Phase 8 — AVL Rotations & Tree Extensions** in the same style as before.

---

## 8. Phase 8 — AVL Rotations & Tree Extensions (S-11)

### 8.0 Goals

By the end of Phase 8 you should have:

- An **AVL variant of BST** that:
    
    - Preserves BST invariants.
        
    - Rebalances via LL / RR / LR / RL rotations.
        
- **VizEvent-level** visualization of:
    
    - Rotations (`Rotate`).
        
    - Rebalancing steps (`Rebalance`), including highlight/comparison.
        
- **UI support** for choosing AVL, running inserts/deletes, and demoing all four rotation cases.
    
- Tests that prove:
    
    - AVL invariants (heights, balance factors).
        
    - `Rotate` / `Rebalance` events correspond to actual structural changes.
        

This fulfills **S-11** (“AVL rotations”) in REQUEST/DESIGN.

---

## 8.1 Design: How AVL fits into existing architecture

> Prereqs: extend shared `Operation`/`Structure` unions with `AVL`, and ensure `Rotate`/`Rebalance` VizEvent fields are defined in `packages/shared` before starting this phase.

**Key constraints from earlier phases:**

- Model in `packages/model-ts` must remain **pure** and independent of UI/Renderer.
    
- Renderer only knows about `VizEvent` (`Rotate`, `Rebalance` etc.).
    
- UI interacts via `Operation`s and `UICommand`s, not via internal AVL APIs.
    
- Before coding, update shared contracts (Operation structure kind union, `Rotate`/`Rebalance` VizEvent fields) and DSL/command factories to include `AVL` so downstream packages stay in sync.
    

So AVL should look like:

- Either **`AVLTree` structure** parallel to `BST`.
    
- Or **BST + configurable “balancing strategy”**.
    

To keep things simple and explicit for this project: **create a separate `AVLTree` structure** that is API-compatible with `BST` but includes balancing & rotation-specific VizEvents.

---

## 8.2 Model: AVLTree implementation (`packages/model-ts/tree/AVLTree.ts`)

### 8.2.1 Internal representation

Reuse the basic `BTNode` schema, with extra fields:

```ts
interface AVLNode {
  id: string;
  key: number;
  left?: AVLNode | null;
  right?: AVLNode | null;
  height: number;   // cached height
}
```

Structure’s internal state:

```ts
interface InternalAVLTree {
  root?: AVLNode | null;
}
```

`AVLTree` class:

```ts
export class AVLTree extends BaseStructure<BinaryTreeSnapshot> {
  private state: InternalAVLTree;

  constructor(id: string, initialKeys?: number[]) {
    super("AVL", id);
    this.state = { root: undefined };
    if (initialKeys) {
      initialKeys.forEach(key => this.insertInternal(key));
    }
  }

  snapshot(): BinaryTreeSnapshot { ... } // reuse BT/BST snapshot shape
  reset(): void { this.state.root = undefined; }

  *apply(op: Operation): Iterable<OpStep> {
    // dispatch on op.kind (Create/Insert/Delete/Find)
  }

  // internal helpers for insert/delete/rebalance...
}
```

### 8.2.2 Invariants & helper functions

Implement core AVL helpers (internal only):

- `height(node)` → `node ? node.height : 0`
    
- `updateHeight(node)` → `node.height = 1 + max(height(left), height(right))`
    
- `balanceFactor(node)` → `height(left) - height(right)` (range should be -1..1)
    
- `rotateLeft(node)` / `rotateRight(node)`.
    

Each rotation helper must:

- Update child pointers correctly.
    
- Update heights in correct order.
    
- Return new subtree root.
    

You’ll also want helpers to generate **OpSteps**:

```ts
function rotationStep(
  type: "LL" | "RR" | "LR" | "RL",
  beforeRootId: string,
  afterRootId: string,
  involvedNodeIds: string[]
): OpStep;
```

This OpStep will include:

- A `Rotate` VizEvent:
    
    - Something like `{ type: "Rotate", kind: type, rootId: beforeRootId, newRootId: afterRootId, nodes: involvedNodeIds }`.
        
- Optional `Highlight` events for involved nodes.
    
- A `Tip` explaining rotation.
    
    - Update `packages/shared` VizEvent union if rotation fields (`rotation`, `pivotId`, `newRootId`, `involvedIds`) are not already present, and extend renderer/layout tests to cover them.
    

### 8.2.3 Insert & Delete with balancing

For each `Insert` and `Delete` operation:

- Perform **normal BST insert/delete** on `AVLNode`.
    
- On recursion unwind, call `updateHeight(node)` and compute `balanceFactor(node)` at each ancestor.
    
- If `balanceFactor` is out of range, apply appropriate rotation(s):
    
    Common scheme:
    
    - **LL case**: `balanceFactor(node) > 1` and `key < node.left!.key`.
        
        - Right rotate at `node`.
            
    - **RR case**: `balanceFactor(node) < -1` and `key > node.right!.key`.
        
        - Left rotate at `node`.
            
    - **LR case**: `balanceFactor(node) > 1` and `key > node.left!.key`.
        
        - Left rotate at `node.left`, then right rotate at `node`.
            
    - **RL case**: `balanceFactor(node) < -1` and `key < node.right!.key`.
        
        - Right rotate at `node.right`, then left rotate at `node`.
            

During balancing, emit `OpStep`s for:

- Traversal and comparisons (`Highlight`, `Compare`) as you recurse.
    
- Each rotation:
    
    - `Rebalance` OpStep (high-level).
        
    - `Rotate` OpStep (specific rotation type).
        
    - Optionally a final OpStep with `snapshot` at the root of the affected subtree or full tree.
        

**OpStep sequencing idea for one `Insert`**:

1. Steps for normal BST insertion (highlight path, create node, link edges).
    
2. A series of steps for each ancestor on the path:
    
    - `Highlight` ancestor.
        
    - `Compare` heights.
        
    - If rotation needed:
        
        - `Rebalance` step: highlight nodes, show which case (LL/RR/LR/RL).
            
        - `Rotate` step: mark nodes that will move; actual structural change is in model state.
            
        - Final snapshot step after rotation.
            

### 8.2.4 Operations supported

Match `BST` operations:

- `Create` from array: insert elements one by one via AVL insert.
    
- `Insert` key.
    
- `Delete` key.
    
- `Find` key (traversal only, no balancing).
    

**Acceptance checks (model-level)**

- AVL invariants:
    
    - For many random sequences of inserts/deletes:
        
        - Inorder traversal is sorted.
            
        - For every node: `Math.abs(balanceFactor(node)) <= 1`.
            
- For a set of carefully chosen keys:
    
    - Insert sequences that trigger **each rotation type** (LL/RR/LR/RL).
        
    - Check OpSteps contain `Rotate` events with correct `kind`.
        
- Shared types updated: `Rotate`/`Rebalance` VizEvents (with fields `rotation`, `pivotId`, `newRootId`, `involvedIds`) are added to `packages/shared`, and renderer/layout tests cover them.
        

---

## 8.3 VizEvent Design for Rotations & Rebalancing

**Goal:** Make `Rotate` and `Rebalance` events expressive but simple for Renderer.

Define them in `packages/shared` (if not already precise):

```ts
export type RotateEvent = {
  type: "Rotate";
  rotation: "LL" | "RR" | "LR" | "RL";
  pivotId: string;          // node being rotated around
  newRootId: string;        // new root of the rotated subtree
  involvedIds: string[];    // nodes that will move visually
};

export type RebalanceEvent = {
  type: "Rebalance";
  nodeId: string;           // ancestor at which imbalance was detected
  beforeBF: number;
  afterBF?: number;         // optional; filled after rotation
};
```

OpStep example for a single rotation:

```ts
{
  events: [
    { type: "Highlight", ids: [nodeId, childId], style: "rebalance" },
    {
      type: "Rebalance",
      nodeId,
      beforeBF: 2,
    },
    {
      type: "Rotate",
      rotation: "LL",
      pivotId: nodeId,
      newRootId: childId,
      involvedIds: [nodeId, childId, grandchildId]
    },
  ],
  explain: "LL rotation at node 30 after inserting 20",
  snapshot: <partial or full snapshot>,
}
```

**Acceptance checks**

- `Rotate` and `Rebalance` types are finalized and documented in shared types.
    
- All rotation logic in `AVLTree` uses these events consistently.
    

---

## 8.4 Renderer Support for Rotate / Rebalance (`viz/engine.ts` + `viz/layout.ts`)

### 8.4.1 Handling `Rotate` & `Rebalance` events

In `applyEvent`:

```ts
case "Rebalance":
  return applyRebalance(state, event);
case "Rotate":
  return applyRotate(state, event);
```

Implementations:

- `applyRebalance`:
    
    - Mostly visual: highlight `nodeId`, optionally store some info in `meta` (e.g., `meta.lastRebalanceNodeId`).
        
- `applyRotate`:
    
    Two choices:
    
    1. **Renderer only shows highlights**, and **layout engine** recomputes actual positions; or
        
    2. Renderer manually swaps positions of involved nodes.
        
    
    Easiest: rely on `layoutTree`:
    
    - `Rotate` event updates some `meta` flag to say “structure changed”.
        
    - In the animation loop (or after applying an OpStep containing `Rotate`), you call `layoutTree(view)` to recompute all node positions.
        
    - Optionally animate moves as separate `Move` events if Model emits them.
        

### 8.4.2 Layout considerations

- AVL rotations are structural, but from layout perspective, they’re just “tree changed”.
    
- Acceptable strategy:
    
    - After every `Rotate` (or `Rebalance` with rotation), run `layoutTree` with a short animation.
        
    - If you want smoother visuals:
        
        - Have model emit `Move` events for nodes whose positions changed.
            
        - Renderer then interpolates from old to new positions.
            

**Acceptance checks (renderer)**

- Given a simple AVL insert sequence that triggers rotation:
    
    - After all steps, tree layout still satisfies parent-above-child and left/right ordering.
        
- `Rotate` events don’t break existing nodes/edges mapping (IDs remain stable).
    

---

## 8.5 UI Integration: AVL as a New Structure Type

### 8.5.1 Extend model factory & commands

In `packages/model-ts/index.ts` (or equivalent):

```ts
case "AVL":
  return new AVLTree(id, payload);
```

In `core/commands.ts`:

- Extend `UICommand` kind list to include `"AVL"`.
    
- Add operation factories:
    
    ```ts
    export function makeAVLInsertOp(id: string, key: number): Operation { ... }
    export function makeAVLDeleteOp(id: string, key: number): Operation { ... }
    export function makeAVLCreateOp(id: string, keys: number[]): Operation { ... }
    ```
    

### 8.5.2 Extend Command Panel UI

- Add “AVL Tree” to structure selection dropdown/tabs.
    
- Provide controls similar to BST:
    
    - Initial keys list.
        
    - Insert key.
        
    - Delete key.
        
    - Find key.
        
- Buttons dispatch AVL-specific operations via new factory helpers.
    

### 8.5.3 AVL demo presets

In `core/demos.ts`:

- Define **four small demos**, each designed to produce one rotation type:
    
    - `AVL_LL`: choose keys like `[30, 20, 10]` → LL rotation at 30.
        
    - `AVL_RR`: keys like `[10, 20, 30]` → RR rotation at 10.
        
    - `AVL_LR`: keys like `[30, 10, 20]` → LR rotation.
        
    - `AVL_RL`: keys like `[10, 30, 20]` → RL rotation.
        

For each demo:

- Create AVL structure `AVL_T`.
    
- Run sequence of `Insert` operations.
    
- Store operations and expected invariants in tests.
    

UI side:

- Add a small subsection under demos:
    
    - “AVL Rotations” with buttons:
        
        - “LL Demo”
            
        - “RR Demo”
            
        - “LR Demo”
            
        - “RL Demo”
            

**Acceptance checks (UI)**

- User can choose “AVL” as structure and run insert/delete operations.
    
- Demos show visible rotations; Explain panel text mentions type (“LL rotation”, etc.).
    

---

## 8.6 Tests & Validation for AVL

### 8.6.1 Unit tests (model)

- **Invariants:**
    
    - After random insert sequences (e.g., 1–100 keys):
        
        - Inorder traversal sorted.
            
        - For each node, `|balanceFactor(node)| <= 1`.
            
        - Heights stored on nodes consistent with subtree heights.
            
- **Rotation types:**
    
    - For each of four rotation demos:
        
        - Run `AVLTree.apply()` on corresponding operations.
            
        - Assert OpSteps contain at least one `Rotate` event with `rotation` matching expected type.
            
        - Renderer/layout tests verify `Rotate`/`Rebalance` VizEvents are handled and final view state remains a valid tree layout.
            
- **Delete operations:**
    
    - Test deletion combinations (delete leaf, delete 1-child node, delete 2-child node) in AVL setting.
        
    - Ensure tree remains balanced afterward.
        

### 8.6.2 Renderer integration tests

- Use OpStep sequences from AVL model tests:
    
    - Feed into `applySteps` and `layoutTree`.
        
    - Assert resulting `ViewState` still has valid tree shape (parent above children, etc.).
        

### 8.6.3 E2E tests

- Add E2E scenario:
    
    - Load “AVL LL Demo”.
        
    - Hit Play.
        
    - After playback:
        
        - Tree labels visible.
            
        - No console errors.
            
        - Explain panel includes mention of “LL rotation”.
            
- Optionally test keyboard control with AVL demos (not mandatory but nice).
    

**Acceptance checks**

- All new model tests for AVL pass.
    
- Renderer continues to pass existing tests; no regression from new event types.
    
- E2E AVL demo passes.

**Commands to run**

- `pnpm --filter model-ts test -- --grep AVL`
- `pnpm --filter web test -- viz`
- `pnpm --filter web test:e2e -- --project=chromium`
    

---

## 8.7 Phase 8 Done-ness Checklist

You can call Phase 8 complete when:

-  `AVLTree` implemented in `packages/model-ts` and wired into `createStructure`.
    
-  AVL operations (`Create`, `Insert`, `Delete`, `Find`) return correct OpStep sequences.
    
-  For random insert/delete sequences:
    
    -  Inorder traversal is sorted.
        
    -  Balance factors are within [-1, 1].
        
-  `Rotate` and `Rebalance` VizEvents defined and used consistently.
    
-  Renderer supports `Rotate` / `Rebalance` without breaking layout.
    
-  UI:
    
    -  “AVL” selectable as structure type.
        
    -  Basic operations available.
        
    -  AVL demo buttons for LL/RR/LR/RL exist.
        
-  Tests:
    
    -  Unit tests cover rotation cases and invariants.
        
    -  Integration tests verify view state after AVL operations.
        
    -  At least one AVL E2E demo test passes.
