# LT-Vis Agents Handbook (`AGENTS.md`)

> Internal contributor guide for **agents and developers** working on the
> Linear & Tree Data Structure Visualizer (LT-Vis) monorepo.
>
> Scope: workflows and conventions for agents; **not** an end‑user manual.

---

## 1. Overview

- **Project**: LT-Vis — visualize algorithmic steps of classic data
  structures (linear lists, stacks, binary trees, BST, Huffman) with
  interactive animations and a replayable **Timeline**.
- **Canonical concepts** (from [`CONTEXT/domain/request.md`](./CONTEXT/domain/request.md) and
  [`CONTEXT/domain/design.md`](./CONTEXT/domain/design.md)):
  - `Structure`, `Operation`, `OpStep`, `VizEvent`, `StateSnapshot`, `Timeline`,
    DSL, Session, Renderer.
- **High-level architecture**:
  - UI (panels, canvas, timeline controls) dispatches `Operation` to the
    ViewModel/Session.
  - Domain Model (`Structure.apply(op) -> Iterable<OpStep>`) is rendering-
    agnostic and only emits `OpStep`/`VizEvent`.
  - Visualization Engine consumes `VizEvent` and maintains visible
    `StateSnapshot` along the `Timeline`.
- **Agents’ shared responsibilities**:
  - Keep documentation aligned to [`CONTEXT/domain/request.md`](./CONTEXT/domain/request.md) and
    [`CONTEXT/domain/design.md`](./CONTEXT/domain/design.md).
  - Propose **patches and docs**, not silent code changes.
  - Respect the separation of Model vs. Renderer and preserve `Structure /
    Operation / OpStep / VizEvent` contracts.

---

## 2. Developer Environment Setup

This section is a **hands-on checklist** for getting a working LT-Vis
environment. Adjust concrete commands to the actual toolchain in
`package.json` once available.

### 2.1 Install toolchain (Node, pnpm)

- Install **Volta** (recommended for pinning Node/pnpm versions):

  ```bash
  curl https://get.volta.sh | bash
  ```

- Use Volta to install Node and pnpm (exact versions may later be pinned in
  `package.json` / config):

  ```bash
  volta install node@latest
  volta install pnpm
  ```

### 2.2 Monorepo layout (target design)

- `apps/web/` — React UI + Renderer + Layout + Timeline controls.
- `packages/shared/` — canonical TypeScript contracts for
  `StateSnapshot`, `Operation`, `OpStep`, `VizEvent`, `Structure`.
- `packages/model-ts/` — implementations of `Structure` (SeqList,
  LinkedList, Stack, BinaryTree, BST, Huffman).
- `examples/` — runnable examples that exercise the Model layer and
  validate timelines (linked-list insert, BST delete, Huffman, etc.).
  - [`CONTEXT/`](./CONTEXT/) — authoritative requirements/design and agent docs.
- `tmp/` — generated snapshots and diagnostics (ephemeral).

### 2.3 Everyday commands

From the repo root (`lt-vis/`), agents and humans should prefer these
commands once wired in `package.json`:

- Install deps:

  ```bash
  pnpm install
  ```

- Build all packages/apps:

  ```bash
  pnpm build
  ```

- Run dev server:
  ```bash
  pnpm dev
  ```

- Run unit tests (Model layer, shared types):

  ```bash
  pnpm test
  ```

- Run E2E / Playwright (web app):

  ```bash
  pnpm test:e2e
  ```

- Lint & format:

  ```bash
  pnpm lint
  pnpm format        # or: pnpm lint:fix
  ```

- Storybook / docs (if present):

  ```bash
  pnpm storybook     # or: pnpm docs:dev
  ```

Agents should **always** read the actual `package.json` scripts and avoid
inventing commands. When in doubt, propose concrete script additions as a
small patch instead of guessing.

---

## 3. Testing Instructions

Testing is organized around the **Model layer** and **Web UI layer**.
Agents should preserve and extend these patterns.

- **Unit tests (Model / shared types)**
  - Framework: **Vitest** (preferred for TypeScript monorepo).
  - Typical commands:
    - `pnpm test` — run unit test suites once.
    - `pnpm test:watch` — watch mode (local only, not CI).
  - Focus:
    - `Structure.apply(op)` mapping to `OpStep[]` for:
      - SeqList insert/delete
      - LinkedList insert/delete
      - Stack push/pop
      - BinaryTree traversals
      - BST insert/search/delete (three deletion cases)
      - Huffman build
    - Invariants: `StateSnapshot` correctness, deterministic `ID` and
      `VizEvent` sequences, error `OpStep` behavior.

- **Integration / E2E tests (Web)**
  - Framework: **Playwright** or similar.
  - Typical commands:
    - `pnpm test:e2e` — full E2E run (CI-suitable).
    - `pnpm test:e2e -- --project=chromium` — single browser.
  - Coverage:
    - Classroom BST deletion demo.
    - Linked-list insertion self-test.
    - Huffman construction.
    - Project save/open and timeline replay.

- **CI behavior (intended)**
  - PRs trigger at least:
    - Type check + lint.
    - Unit tests for packages touched.
    - Targeted E2E suites for apps impacted (e.g., changes under
      `apps/web/` run web E2E only).
  - Agents proposing CI changes should keep the matrix minimal and based on
    changed paths.

Agents must not mark tests as skipped to “make CI green”; instead they
should:
1. Document flaky or failing tests in `tmp/dev-healthcheck.md`.
2. Propose focused fixes in a follow-up patch.

---

## 4. Git Workflow Guidelines

These rules apply to both humans and agents producing patch proposals.

- **Branch naming**
  - Feature branches:
    - `feat/<scope>-<short-description>`
  - Bugfix branches:
    - `fix/<scope>-<issue-or-bug>`
  - Docs / agents:
    - `docs/<area>-<summary>`
    - `agents/<area>-<summary>`

- **Commit convention** (semantic / conventional commits)
  - Examples:
    - `feat(model): add BST delete three-case handling`
    - `fix(renderer): correct stepBack snapshot usage`
    - `docs(context): refine REQUEST timeline definitions`
    - `chore(ci): add vitest coverage threshold`
  - Prefer small, logically scoped commits.

- **Pull Requests**
  - Use a PR template capturing:
    - Summary & motivation.
    - Affected `Structure` / `Operation` / `OpStep` / `VizEvent` (if any).
    - Testing performed (unit, E2E, manual).
    - Impact on DSL, persistence schema, or public APIs.
  - PR checklist (humans/agents):
    - [ ] Tests added/updated where appropriate.
    - [ ] Domain docs ([`CONTEXT/domain/`](./CONTEXT/domain/)) are still accurate or updated.
    - [ ] Agent docs ([`CONTEXT/agent/`](./CONTEXT/agent/), `AGENTS.md`, `experts/*.md`) updated
          when behavior/workflow changes.

- **Code review expectations**
  - Reviewers should:
    - Validate alignment with `Structure / Operation / OpStep / VizEvent`
      contracts.
    - Request tests for new algorithmic paths or edge cases.
    - Ensure docs and examples (`examples/`) remain consistent.
  - Agents must not self-approve; they provide patch text and rely on human
    maintainers to apply/merge.

- **Local review tools**
  - Agents **may use** `git status` and `git diff` to understand and
    summarize working-copy changes when drafting documentation or patch
    proposals.
  - Any interpretation of these commands must still be reflected as
    explicit Markdown or diff blocks for human review.

- **Tagging / releases** (lightweight)
  - Tags follow `vMAJOR.MINOR.PATCH`.
  - Changelog entries group by:
    - Model changes (Structures / Operations).
    - Renderer / Timeline.
    - DSL / IO / NL.
    - Docs & agents.

- **Issue triage workflow**
  - Label issues by area: `model`, `renderer`, `timeline`, `dsl`, `io`,
    `docs`, `agents`.
  - Attach scenarios from [`CONTEXT/domain/request.md`](./CONTEXT/domain/request.md) (Scenario A–E) when
    applicable.
  - For bugs:
    - Capture a minimal `Operation[]` sequence and expected vs. actual
      `OpStep`/`VizEvent`.
    - Link any failing tests or examples.

---

## 5. Agent Contribution Guidelines

This section defines how internal agents (including LT-Vis Doc Robot)
participate safely.

- **General safety rules**
  - Prefer **patch proposals** (Markdown or unified diff) over direct git
    operations.
  - Never modify production configuration (CI, deployment) without a clear
    request and justification.
  - Avoid speculative refactors that cross multiple subsystems in one PR.

- **Working with the Model contracts**
  - Any change to `Structure`, `Operation`, `OpStep`, or `VizEvent` must:
    - Update `packages/shared` types first.
    - Update usages in `packages/model-ts`, `apps/web`, and `examples/`.
    - Update relevant sections in [`CONTEXT/domain/request.md`](./CONTEXT/domain/request.md) and
      [`CONTEXT/domain/design.md`](./CONTEXT/domain/design.md).
  - Agents should supply:
    - A short rationale tied to teaching scenarios (e.g., BST deletion
      Scenario A).
    - At least one example OpStep sequence or test case.

- **Writing and applying patches**
  - Use small, focused diffs:
    - One conceptual change per patch (e.g., “add Huffman tests”).
  - Preserve existing naming and folder conventions unless the user asks
    for broader reorganization.
  - When patching tests:
    - Prefer improving assertions over weakening them.
    - Do not silently delete coverage.

- **Fallback and failure handling**
  - If an agent cannot complete a task safely:
    - Record the partial analysis and recommended next steps in
      `tmp/dev-healthcheck.md`.
    - Reference the relevant files and contexts explicitly.
  - When inconsistent docs are detected between `CONTEXT/domain/` and the
    implementation:
    - Call it out explicitly in the proposed patch or snapshot.
    - Suggest which source of truth should be updated.

- **Maintaining agent docs under `CONTEXT/agent/`**
  - Keep documents short, checklist-like, and operational.
  - Use the [`CONTEXT/agent/dependency-legend.yaml`](./CONTEXT/agent/dependency-legend.yaml) schema (once populated) whenever
    describing tools, external services, or infrastructure.
  - When adding a new playbook (e.g., `dev-env-playbook.md`), ensure it:
    - References this `AGENTS.md`.
    - Avoids duplicating domain-level info from `CONTEXT/domain/`.

- **Writing system prompts for new agents**
  - Each agent must have a dedicated file under
    [`CONTEXT/agent/experts/`](./CONTEXT/agent/experts/) as `<agent-id>.md` containing:
    - Agent Name
    - Agent ID (stable token)
    - System Prompt (full)
    - Notes (scope, dependencies, usage patterns)
  - Prompts must:
    - Declare which directories and file types the agent may modify.
    - State whether it can change code or only docs.
    - Reference canonical domain docs where applicable.

---

## 6. Context Management

- **Canonical sources**: Treat [`CONTEXT/domain/`](./CONTEXT/domain/),
  [`CONTEXT/agent/experts/`](./CONTEXT/agent/experts/), and
  [`CONTEXT/agent/context-strategy.md`](./CONTEXT/agent/context-strategy.md)
  as the primary references for project intent, agent behavior, and
  context-handling rules.
- **Model/renderer separation**: See [`CONTEXT/agent/model-renderer-contract.md`](./CONTEXT/agent/model-renderer-contract.md) — model snapshots are topology-only (no x/y); renderer/layout recompute positions/animations per step; operations must Create before other ops; timeline/playback must consume all OpSteps.
- **Project lessons**: High-level restart/onboarding guidance is in [`CONTEXT/agent/project-lessons.md`](./CONTEXT/agent/project-lessons.md); review it when planning or refactoring.
- **Contracts quickref**: Use [`CONTEXT/agent/contracts-quickref.md`](./CONTEXT/agent/contracts-quickref.md) for mandatory type/contract/dependency reminders before patching.
- **Retrieval-first**: Before relying on chat history, re-read the
  relevant files from `CONTEXT/` and this handbook to rebuild your
  working context.
- **Snapshots as rolling memory**: Use `tmp/` (for example
  `tmp/monorepo-overview.md`, `tmp/dev-healthcheck.md`) to store
  short-lived summaries and health checks instead of carrying long
  conversational context.
- **Auto-reset protocol**: When you notice context drift (forgetting
  terms, paths, or rules), follow the reset steps in
  `context-strategy.md`: reload domain docs, your expert prompt, and
  `AGENTS.md`, then reconstruct tasks from the latest `tmp/` files.

---

## 7. Roadmap Workflow for Agents

This section translates the LT-Vis roadmap into actionable rules for agents.
Each agent must consult this workflow before starting work on a feature or fix.

### 7.1 Core Principle: Follow the Phases

- All work must align with a phase defined in
  [`CONTEXT/domain/roadmap/`](./CONTEXT/domain/roadmap/).
- Do not implement features from a later phase without explicit user
  instruction.
- When starting a task, state which phase it belongs to.

### 7.2 General Agent Conduct
- **Check `AGENTS.md` and `CONTEXT/` first**: Before starting any task, refresh your context.
- **Check `roadmap-overview.md` second**: Understand the workflow context by quickly reviewing the overview.
- **Check related phases inside `CONTEXT/domain/roadmap/`**:See what the contract is and what it requires.
- **Announce your phase**: In your first message for a task, state which roadmap phase you are working in.
- **Propose, don’t impose**: Use patches for code and docs. Let the human maintainer review and merge.

---

## 8. Agents Catalog

| Agent ID | Name | Primary Role | Scope | System Prompt File |
|---|---|---|---|---|
| doc-robot | LT-Vis Doc Robot | Repo snapshots, agent & dev docs | `CONTEXT/`, `tmp/`, `CONTEXT/agent/` | `CONTEXT/agent/experts/doc-robot.md` |
| dev-debugger | Agent Dev Debug Copilot | Analyzes and debugs other agents | Read-only analysis, proposes prompts | `CONTEXT/agent/experts/dev-debugger.md` |
| code-copilot | LT-Vis Coding Copilot | Roadmap-aligned coding & tests | `packages/`, `apps/web/`, `examples/`, `CONTEXT/domain/` | `CONTEXT/agent/experts/code-copilot.md` |

Add new rows when new agents are introduced; keep this table in sync with
the `experts/` directory.

---

## 9. Change Log

Chronological list of significant changes to agents or workflows.

- **2025-11-19** — Initial `AGENTS.md` created for LT-Vis:
  - Defined overview and architecture alignment for agents.
  - Documented environment expectations and baseline commands.
  - Added testing, Git workflow, and agent contribution guidelines.
  - Registered `doc-robot` in Agents Catalog.
- **2025-11-30** — Added `dev-debugger` agent to catalog and created its
  expert prompt.
- **2025-12-07** — Added `code-copilot` agent (coding aligned to roadmap) and
  registered its expert prompt.
