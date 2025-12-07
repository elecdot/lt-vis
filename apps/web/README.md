# LT-Vis Web

Minimal Vite + React scaffold to satisfy roadmap Phase 0/1. The app currently renders a placeholder
card that pulls shared contracts and demo OpStep data; renderer/timeline wiring comes in later
phases.

## Commands

From repo root:

- `pnpm dev` — runs Vite dev server for `@ltvis/web`.
- `pnpm --filter @ltvis/web build` — Vite production build.
- `pnpm --filter @ltvis/web test` — Vitest (none yet, will be added with features).
- `pnpm --filter @ltvis/web typecheck` — TypeScript noEmit check.

Prereqs: install dependencies with `pnpm install` (root) after updating `pnpm-lock.yaml`.
