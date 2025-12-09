# Model ↔ Renderer Separation (Updated from Phase 5/6 learnings)

This note captures issues discovered during Phase 5/6 and the required contract to keep the model pure and visuals handled in the renderer/UI.

## Problems Observed
- Model snapshots included `x/y`, causing renderer to reuse tight coordinates and overlap nodes (lists, BST leaves).
- OpStep sequences were logical but sparse; renderer/layout snapped states without smoothing because it trusted incoming positions.
- Demos failed when ops ran before a corresponding Create (e.g., Huffman Build without Create).
- Playback/UI sometimes bypassed the timeline or didn’t consume all steps, leading to desyncs.

## Required Contract
- **Model purity**: snapshots carry topology only (id, value/label, props, edges, meta). Do **not** emit `x/y` for non-pinned nodes. OpSteps describe logical actions only (Highlight/Compare/Link/Unlink/Create/Remove/Tip/Rotate/Rebalance/Error) with per-step snapshots.
- **Renderer ownership**: renderer/layout recompute positions per step from topology, ignoring snapshot coordinates for non-pinned nodes. Renderer handles animations (Move tweening, link appearance) internally.
- **Spacing/layout**: layoutLinear positions by index/order with safe defaults; layoutTree uses width-aware spacing to avoid overlap. Never reuse stale node positions from model snapshots.
- **Operation sequencing**: All operations must go through a Create first (auto-create when appropriate, e.g., Huffman). Timeline/playback must flatten all OpSteps and stay in sync.
- **Error handling**: Errors should not advance renderer/timeline; keep prior view state intact.

## Agent Checklist
- When touching model (`packages/model-ts`): strip coords from snapshots; keep per-step snapshots; no visual hints.
- When touching renderer/layout (`apps/web/src/viz/*`): always recompute layout after steps; animate transitions internally; ignore snapshot coords.
- When touching playback/UI: ensure all OpSteps are consumed via the timeline; keep renderer/timeline indices in sync; surface errors without mutating view state.

Keep this file in sync if future phases adjust the separation.***
