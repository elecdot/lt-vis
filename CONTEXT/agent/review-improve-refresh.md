# Task: Review, Improve, and Refresh Workflow (Any Agent)

> Use this task to periodically realign **any** agent’s behavior and expert
> prompt with the current repo state and context docs.

## 1. Preparation

1. Identify the agent
   - Locate its expert prompt file: `CONTEXT/agent/experts/<agent-id>.md`.
   - Note Agent Name and Agent ID.

2. Load canonical context from disk (not from chat)
   - `CONTEXT/README.md`
   - `CONTEXT/domain/request.md`
   - `CONTEXT/domain/design.md`
   - `CONTEXT/agent/context-strategy.md` (if present)
   - `AGENTS.md`
   - `CONTEXT/agent/experts/<agent-id>.md` (this agent’s prompt)

3. Reconstruct recent behavior
   - For **any** agent, skim:
     - `AGENTS.md` for shared workflow rules and scope.
     - Relevant `CONTEXT/` docs it is expected to follow.
   - **Optional (role-dependent)**:
     - If the agent writes logs or snapshots (for example, doc-oriented
       agents using `tmp/`), consult those files to understand recent work.
     - Coding agents might instead look at tests, code structure, or CI
       config they touched.

---

## 2. Goals

- Compare the agent’s **documented role and rules** with its **actual or
  intended behavior** in this repo.
- Identify unclear, missing, or contradictory parts in the current expert
  prompt (`<agent-id>.md`).
- Rewrite the prompt so it is clearer, stricter, and more reliable:
  - Explicit scope and non-scope (“must not” list).
  - Explicit authority hierarchy and context usage.
- Refresh the agent’s mental model using `CONTEXT/` and (where relevant)
  `context-strategy.md`, not long chat history.

---

## 3. Deliverables

### 3.1 Review

Brief notes that cover:

- **What works well**
  - Prompt parts and behaviors that are clear and effective for this agent’s
    role (coding, docs, tooling, etc.).
- **What is weak or unclear**
  - Ambiguous scope, missing constraints, fuzzy ownership of directories
    or tasks.
- **What needs to change**
  - Outdated references, missing safety rules, or conflicts with
    `CONTEXT/domain/*` or `AGENTS.md`.

### 3.2 Updated Expert Prompt

Produce a complete, replaceable rewrite of
`CONTEXT/agent/experts/<agent-id>.md`:

- Structure (at minimum):
  - **Agent Name**
  - **Agent ID**
  - **System Prompt** (behavior contract: scope, authority ordering,
    retrieval-first rules)
  - **Responsibilities** (R1, R2, … tailored to this agent type)
  - **Operating Guidelines** (how it should behave in practice)
  - **Notes** (scope boundaries, dependencies, typical usage patterns)
- Use markdown links for file references, for example:
  - `CONTEXT/domain/request.md` → `[...](../../domain/request.md)`
  - `AGENTS.md` → `[AGENTS.md](../../../AGENTS.md)`
- Make the new content a **drop-in replacement** for the old prompt.

### 3.3 Refresh Conclusion

Summarize how this agent will act going forward:

- Which rules or boundaries are now clearer or stricter.
- How it will use:
  - `CONTEXT/domain/*` for requirements/architecture.
  - `CONTEXT/agent/*` for workflows and strategies.
  - `AGENTS.md` for cross-agent conventions.
  - Any role-specific “memory” area:
    - e.g. `tmp/` for doc/snapshot agents,
    - code/tests/CI files for coding or infra agents.

### 3.4 Suggestions (Optional)

Propose structural or workflow improvements that help **this agent type and
others**, such as:

- New or refined sections in `AGENTS.md` (e.g., coding-agent safety rules,
  CI interaction guidelines, or doc-agent snapshot patterns).
- New or updated playbooks under `CONTEXT/agent/` for specific roles:
  - dev env, fallback strategies, tool usage, review/refresh variants.
- Additional, role-appropriate “memory” mechanisms:
  - For doc agents: new snapshot templates under `tmp/`.
  - For coding agents: structured test-matrix docs, module maps, or
    change-impact guides.