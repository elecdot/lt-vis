# LT-Vis `CONTEXT/` Directory

Single entry point for **requirements**, **design**, and **agent docs**.

---

## 1. What This Folder Is For

- Keep humans and agents aligned on what LT-Vis is and how it should work.
- Treat `CONTEXT/` as the starting point when requirements and code
  disagree.

---

## 2. Index

Minimal map of the most important entry points:

- [`CONTEXT/domain/request.md`](./domain/request.md) — requirements, users,
  terminology, core scenarios.
- [`CONTEXT/domain/design.md`](./domain/design.md) — architecture, shared
  contracts, flows.
- [`CONTEXT/domain/roadmap/`](./domain/r.admap/) — roadmap and phase
  breakdown.
- [`CONTEXT/agent/`](./agent/) — agent prompts, strategies, dependency
  legend, and future playbooks.

---

## 3. Day-to-Day Usage

- Before implementing a feature or fix: open `domain/request.md` and
  `domain/design.md`.
- Before changing workflows or prompts: open `AGENTS.md` and
  `CONTEXT/agent/`.
- When you see a mismatch between code and docs: log it under `tmp/`
  (for example, `tmp/dev-healthcheck.md`) and propose a patch describing
  which side should change.

That’s it—start here, follow the links, then jump into `apps/`,
`packages/`, or `examples/` once you know the intent.
