# Phase 2 Tree/Huffman Plan (model-ts)

- **BinaryTree core**: internal node type `{ id, value, left?, right? }`; operations: Create (from array or pairs), Traverse (pre/in/post/level) emitting `Highlight`, `Tip`, `Compare`, and snapshots per step.
- **BST**: build on BinaryTree with insert/find/delete (three delete cases). Emit `Highlight` while searching, `Link/Unlink/CreateNode/RemoveNode` on structural edits, final OpStep carries snapshot; error OpStep on missing key for delete/find.
- **HuffmanTree**: build from weight map via min-heap; emit `CreateNode`, `Link`, `Tip` for merges; final snapshot includes weights in `NodeState.props` and root selection. Consider per-merge OpSteps if UI needs granular playback.
- **Shared helpers**: create `tree/helpers.ts` for ID/edge helpers (`${id}:L`/`R` edges as `src->dst:L|R`), snapshot builders, and error/wrong-target handling mirroring linear base.
- **Factories**: export `BinaryTree`, `BST`, `HuffmanTree` and extend `createStructure` when implemented.
- **Tests**: Vitest suites for insert/delete (BST), traversals (BinaryTree), and Huffman cost/structure; ensure per-step snapshots and deterministic IDs.
