Here’s a zoomed-in roadmap for **Phase 2 — Model** so a small team can actually build it.

---

## 2. Phase 2 — Core Model (Detailed Roadmap)

### 2.0 Goals (what Phase 2 must achieve)

- Implement all core data structures in **`packages/model-ts`**, fully typed and **UI-agnostic**.
    
- For each `Operation`, produce an `Iterable<OpStep>` with meaningful `VizEvent[]`, `explain?`, `snapshot?`, `error?`.
    
- Match the **example scenarios in REQUEST.md** (linked list insert, BST delete, Huffman).
    
- Provide **strong tests** so Renderer/UI can treat the model as a “black box” that Just Works.
    

Done right, after Phase 2:

- Given a `Structure` + `Operation`, team can:
    
    - Run pure TS code.
        
    - Get `OpStep[]` + final `snapshot`.
        
    - Serialize timeline to JSON and inspect it without any UI.
        

---

## 2.1 Cross-cutting Design Decisions (do this first)

**Goals**

- Lock down conventions that all structures must follow.
    
- Avoid per-structure improvisation in OpStep/VizEvent usage.
    

**Work items**

1. **Directory layout for `packages/model-ts`**
    
    ```text
    packages/model-ts/
      src/
        core/
          structure.ts      // base Structure interface wrappers, helpers
          snapshot.ts       // shared snapshot helpers
          ops.ts            // Operation helpers, type guards
          steps.ts          // OpStep/VizEvent helpers
          errors.ts         // model-level error types
        list/
          SeqList.ts
          LinkedList.ts
          Stack.ts
        tree/
          BinaryTree.ts
          BST.ts
          Huffman.ts
        index.ts            // public API: createStructure(), re-exports
    ```
    
2. **Error semantics**
    
    - If an operation is invalid (e.g. out-of-bounds index, pop empty stack, delete missing key):
        
        - **Do not mutate** internal state.
            
        - Return **exactly one** `OpStep`:
            
            - `error` set with machine-usable info (code, message).
                
            - `events` may include `Highlight` (e.g. highlight invalid index) and a `Tip`.
                
            - `snapshot` should be the **pre-error snapshot** so stepBack remains consistent.
                
3. **Snapshot semantics**
    
    - `Structure.snapshot()` returns a _logical_ structure snapshot:
        
        - For lists: ordered values with metadata (e.g. node IDs, etc.).
            
        - For trees: nodes + parent/children relationships.
            
    - `OpStep.snapshot`:
        
        - **Include a snapshot on every OpStep** (REQUEST §8.1 / DESIGN §7) so playback reversal is snapshot-first.
            
        - **Last OpStep** of each `apply(op)` must have a snapshot matching `Structure.snapshot()`.
            
4. **OpStep/VizEvent conventions**
    
    - Typical **structure change pattern**:
        
        - **Before** change: `Highlight`/`Compare`.
            
        - **On change**: `CreateNode`/`RemoveNode`/`Link`/`Unlink`/`Swap`/`Rotate`/`Rebalance`.
            
        - **After** change: `Move` (for layout hints), `Tip`, snapshot.
            
    - Use `NodeState.props` for semantic info:
        
        - For list/stack: `{ value, index }`.
            
        - For trees: `{ value, key, height?, weight?, balance? }`.
            

**Acceptance checks**

- Single `OpStep` helper module (`steps.ts`) provides small helpers like `stepWithTip()`, `createNodeStep()`, etc.
    
- All structures use the **same helpers**; OpStep shape is consistent across modules.
    

---

## 2.2 Step 1 — Base Types & Helpers Wiring (Core)

**Goals**

- Make `packages/model-ts` compile, importing only **shared types**.
    
- Provide base `Structure`-related utilities to reduce boilerplate.
    

**Work items**

- Implement:
    
    ```ts
    // core/structure.ts
    import { Structure, Operation, OpStep } from "@ltvis/shared";
    
    export abstract class BaseStructure<TSnapshot> implements Structure {
      readonly kind: string;
      readonly id: string;
    
      protected constructor(kind: string, id: string) {
        this.kind = kind;
        this.id = id;
      }
    
      abstract snapshot(): TSnapshot;
      abstract reset(): void;
      abstract apply(op: Operation): Iterable<OpStep>;
    }
    
    export function isOperationFor(op: Operation, targetId: string): boolean {
      return op.target === targetId;
    }
    ```
    
- Implement **Operation type guards** in `core/ops.ts`:
    
    ```ts
    import { Operation } from "@ltvis/shared";
    
    export function isListOp(op: Operation): op is ListOperation { ... }
    export function isTreeOp(op: Operation): op is TreeOperation { ... }
    ```
    
- Implement **OpStep helpers**:
    
    ```ts
    export function step(events: VizEvent[], explain?: string, snapshot?: Snapshot): OpStep { ... }
    export function errorStep(message: string, detail?: unknown): OpStep { ... }
    ```
    

**Acceptance checks**

- `packages/model-ts` builds.
    
- A dummy `FakeStructure` using `BaseStructure` can be instantiated in tests and returns a trivial OpStep.
    

---

## 2.3 Step 2 — SeqList & Stack (Foundation for M-01/M-02)

Start with array-backed structures: easiest to implement and test.

### 2.3.1 Goals

- Implement `SeqList` and `Stack` with correct logic + OpSteps.
    
- Ensure behavior lines up with **REQUEST examples** and expectations.
    

### 2.3.2 Work items — SeqList

Internal representation:

```ts
interface InternalSeqList {
  data: number[];  // or generic <T>, but M-phase may be number-first
}
```

Class:

```ts
// list/SeqList.ts
export class SeqList extends BaseStructure<SeqListSnapshot> {
  private state: InternalSeqList;

  constructor(id: string, initial?: number[]) {
    super("SeqList", id);
    this.state = { data: [...(initial ?? [])] };
  }

  snapshot(): SeqListSnapshot { ... }
  reset(): void { ... }
  *apply(op: Operation): Iterable<OpStep> { ... }
}
```

Operations to support:

- `Create` (from list of values)
    
- `Insert` (by index)
    
- `Delete` (by index)
    
- `Find` (by value)
    

OpStep patterns (examples):

- `Insert` at index `i`:
    
    1. Highlight target index.
        
    2. Move nodes after index (optional, for visual shift).
        
    3. CreateNode for new element.
        
    4. Tip: `"Insert 2 at index 1 in [1,3,4]"`.
        
    5. Final step with updated snapshot.
        
- `Delete`:
    
    1. Highlight element at index `i`.
        
    2. RemoveNode.
        
    3. Move subsequent nodes left.
        
    4. Final snapshot step.
        

Tests:

- Compare against JS array:
    
    ```ts
    // For random arrays and random operations:
    //  - run on SeqList
    //  - run on plain JS array
    //  - compare final content
    ```
    

### 2.3.3 Work items — Stack

Internal representation:

```ts
interface InternalStack {
  data: number[];
}
```

Operations:

- `Push`
    
- `Pop`
    
- `Create` (from list)
    

OpStep patterns:

- `Push`:
    
    1. CreateNode at top position.
        
    2. Link edge from previous top (if needed) or highlight top.
        
    3. Final snapshot.
        
- `Pop`:
    
    1. Highlight top.
        
    2. RemoveNode.
        
    3. Final snapshot.
        

Tests:

- LIFO correctness vs JS array `push/pop`.
    
- Invalid `Pop` when empty → `errorStep`.
    

**Acceptance checks**

- SeqList and Stack unit tests cover:
    
    - Normal operations.
        
    - Boundary cases (index 0, index = size, size 0).
        
    - Errors.
        
- OpSteps include expected event types (`CreateNode`, `RemoveNode`, `Highlight`, `Move`, `Tip`).
    

---

## 2.4 Step 3 — LinkedList (M-01 Extended)

### Goals

- Implement singly (or doubly) linked list with pointer manipulations.
    
- Visualize pointer changes through `Link/Unlink` VizEvents.
    

### Work items

Internal representation:

```ts
interface LLNode { id: string; value: number; next?: LLNode | null; }
interface InternalLinkedList { head?: LLNode | null; }
```

Operations:

- `Create` from list.
    
- `Insert` at index.
    
- `Delete` at index.
    
- `Find` by value.
    

Core logic:

- Standard pointer-based insert/delete by index.
    
- Keep **stable node IDs** as much as possible (to reduce re-layout events).
    

OpStep patterns:

- Walk to index `i`:
    
    - For each advance:
        
        - `Highlight` current node.
            
        - Optional `Compare` with index or key.
            
- Insert:
    
    1. Walk and highlight predecessor node.
        
    2. CreateNode new element.
        
    3. Unlink predecessor → old next.
        
    4. Link predecessor → new node.
        
    5. Link new node → old next.
        
    6. Tip + snapshot.
        
- Delete:
    
    1. Walk to predecessor.
        
    2. Highlight target.
        
    3. Unlink predecessor → target.
        
    4. Link predecessor → target.next.
        
    5. RemoveNode for target.
        
    6. Tip + snapshot.
        

Tests:

- Deterministic example from REQUEST: `[1,3,4]` insert 2 at index 1.
    
    - Check final linked list values.
        
    - Check OpStep sequence has expected event order.
        

**Acceptance checks**

- LinkedList passes all CRUD tests vs JS array, including head and last element operations.
    
- Example `[1,3,4] insert 2` matches documented target snapshot and has a **readable** sequence of steps.
    

---

## 2.5 Step 4 — BinaryTree (Plain) (M-03 Preparation)

### Goals

- Implement a generic binary tree model that BST/Huffman will reuse.
    
- Provide traversal & basic building operations.
    

### Work items

Internal representation:

```ts
interface BTNode {
  id: string;
  value: number;
  left?: BTNode | null;
  right?: BTNode | null;
}

interface InternalBinaryTree {
  root?: BTNode | null;
}
```

Operations:

- `Create` from array (e.g., level-order or insert-as-BST depending on request; check REQUEST.md).
    
- Traversals (if needed as operations): `PreOrder`, `InOrder`, `PostOrder`, `LevelOrder`.
    

OpStep patterns:

- Traversal:
    
    - At each node:
        
        - `Highlight` node.
            
        - Optional `Tip` like `"Visit node 5 in inorder traversal"`.
            

Tests:

- Tree building from a known sequence; verify traversals match expected order.
    
- Snapshot representation clearly lists nodes and edges (for later layout).
    

**Acceptance checks**

- Plain binary tree supports at least the operations that BST/Huffman depend on.
    
- Snapshot format can be used directly by Renderer (nodes/edges mapping is clear).
    

---

## 2.6 Step 5 — BST (M-03/M-04 Core)

### Goals

- Implement standard BST insert/find/delete.
    
- Produce good OpSteps, especially for **delete** in all three cases.
    

### Work items

Internal representation:

- Reuse `BTNode` but add optional metadata in props (height etc. reserved for AVL later).
    

Operations:

- `Create` from array by repeated insert.
    
- `Insert` key.
    
- `Find` key.
    
- `Delete` key.
    

Logic:

- Classic BST insert/delete:
    
    - Delete cases: leaf, one child, two children (inorder successor swap).
        

OpStep patterns:

- `Find`:
    
    - For each node visited:
        
        - `Highlight`.
            
        - `Compare` (key vs node value).
            
    - On success: `Tip` “Found key 7”.
        
- `Insert`:
    
    - Same as find, then:
        
        - `CreateNode` for new node.
            
        - `Link` from parent.
            
        - Optional `Move` for layout hints.
            
        - Final snapshot.
            
- `Delete`:
    
    - Walk down as in `Find`.
        
    - For each case:
        
        1. **Leaf**:
            
            - Highlight target leaf.
                
            - Unlink parent → leaf.
                
            - RemoveNode leaf.
                
            - Snapshot.
                
        2. **One child**:
            
            - Highlight target.
                
            - Link parent → child.
                
            - Unlink target → child.
                
            - RemoveNode target.
                
            - Snapshot.
                
        3. **Two children**:
            
            - Highlight target.
                
            - Find inorder successor:
                
                - Highlight path + successor.
                    
            - Swap values: `Swap` VizEvent between target and successor.
                
            - Now successor has simpler case (leaf/one child): apply those steps.
                
            - Snapshot.
                

Tests:

- Validate invariants with inorder traversal == sorted sequence.
    
- Test each delete case explicitly:
    
    - Example from REQUEST: `[5,3,7,2,4,6,8] delete 7`.
        
    - Additional tests for leaf and two-child deletions.
        

**Acceptance checks**

- BST operations all pass tests; invariants hold.
    
- Example required by REQUEST.md matches final snapshot exactly.
    
- OpSteps for deletion clearly show the three conceptual cases.
    

---

## 2.7 Step 6 — Huffman Tree (M-05)

### Goals

- Build a Huffman tree from `{symbol: weight}` map.
    
- Generate OpSteps that show the greedy process.
    

### Work items

Internal representation:

```ts
interface HuffmanNode {
  id: string;
  symbol?: string; // undefined for internal nodes
  weight: number;
  left?: HuffmanNode | null;
  right?: HuffmanNode | null;
}
```

Operations:

- `BuildHuffman` from `{[symbol: string]: number}`.
    

Logic:

- Classic algorithm:
    
    - Use min-heap priority queue of nodes.
        
    - Repeatedly extract two smallest, merge into parent, reinsert.
        
    - When one node remains → root.
        

OpStep patterns per merge:

1. Highlight the two smallest nodes.
    
2. `Compare` their weights.
    
3. `CreateNode` for parent (with `weight = w1 + w2`).
    
4. `Link` parent → each child.
    
5. Optional `RemoveNode` on old “leaf-only” timeline (or keep leaves; depends on design).
    
6. `Tip` summarizing the merge.
    
7. Optional snapshot at each merge or only final.
    

Tests:

- Known example `{a:5, b:9, c:12, d:13, e:16, f:45}`:
    
    - Validate total weighted path length against known optimum.
        
    - Check each internal node weight equals sum of children.
        
    - In-order or pre-order may not be meaningful, but tree structure must obey Huffman properties.
        

**Acceptance checks**

- Huffman builder passes classic test cases.
    
- OpSteps show merges in the exact order produced by the priority queue.
    
- Final snapshot tree is consistent with merges.
    

---

## 2.8 Step 7 — Cross-Structure Testing & Examples Wiring

### Goals

- Ensure all structures behave consistently as `Structure` implementations.
    
- Make the REQUEST examples first-class tests.
    

### Work items

1. **Factory function**
    
    ```ts
    // index.ts
    export function createStructure(kind: StructureKind, id: string, payload?: any): Structure {
      switch (kind) {
        case "SeqList": return new SeqList(id, payload);
        case "LinkedList": return new LinkedList(id, payload);
        case "Stack": return new Stack(id, payload);
        case "BinaryTree": return new BinaryTree(id, payload);
        case "BST": return new BST(id, payload);
        case "Huffman": return new HuffmanTree(id, payload);
      }
    }
    ```
    
2. **Uniform tests for `Structure.apply()`**
    
    - For each `kind`, create the structure via `createStructure`.
        
    - Apply a fixed sequence of Operations from the examples.
        
    - Check:
        
        - Final `snapshot()` matches expected value structure.
            
        - OpStep[] length > 0 and last step has snapshot.
            
        - No OpStep has both `error` and a state change event.
        
        - `resetFromSnapshot(snapshot)` (or equivalent helper) restores state without replay when given a valid snapshot; include a round-trip test per structure.
3. **REQUEST examples as test fixtures**
    
    - Add unit tests directly for:
        
        - Linked List example `[1,3,4] insert 2`.
            
        - BST example `[5,3,7,2,4,6,8] delete 7`.
            
        - Huffman example with 6 letters.
            

**Acceptance checks**

- All core model tests green.
    
- REQUEST.md examples are explicitly present as tests, not just “manual demos”.
    
- `createStructure` and Structure interface behave uniformly across all kinds.

- Each `Structure` implements `resetFromSnapshot(snapshot: StateSnapshot)` (or equivalent), with a round-trip test per structure to support persistence/import.
    

---

## 2.9 Step 8 — Phase 2 Done-ness Checklist

You can treat this as the **final gate** before starting Renderer work.

-  `packages/model-ts` builds with **no** UI/DOM dependencies.
    
-  `SeqList`, `LinkedList`, `Stack`, `BinaryTree`, `BST`, `Huffman` implemented and exported.
    
-  Each `apply(op)`:
    
    -  Handles valid ops with correct final snapshots.
        
    -  Handles invalid ops with `errorStep` and no state change.
        
-  OpStep/VizEvent patterns are consistent and use shared helpers.
    
-  All REQUEST **core examples** are covered by tests and pass.
    
-  Test coverage for `packages/model-ts` ≥ 80% (plan to grow later).
    
-  A simple headless script (e.g. `examples/run_bst_example.ts`) can:
    
    -  Build a BST.
        
    -  Run a delete operation.
        
    -  Print OpSteps to console / JSON.
        
