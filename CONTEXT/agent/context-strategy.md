# Task: Strategy for Avoiding Context Limit / Context Collapse  
You (the agent) must generate a **technical, actionable strategy** that allows the LT-Vis multi-agent system to operate reliably even when context windows are small or when sessions are long-lived.

Your output must be a **developer-oriented playbook**, usable by human contributors and by other agents stored under `CONTEXT/agent/experts/`.

The strategy should include:

---

## 1. Multi-Layered Memory Architecture
Explain how to organize knowledge so agents never depend on a single long context window:
- **Static canonical memory** → stored in `CONTEXT/domain/`  
  (REQUEST.md, DESIGN.md, ARCHITECTURE.md, etc.)
- **Long-term agent memory** → stored as files under `CONTEXT/agent/`  
  (dependency legend, playbooks, workflow docs)
- **Per-agent system prompts** → stored under `CONTEXT/agent/experts/`
- **Short-term session memory** → scratchpad files under `tmp/`

Each layer must clearly define:
- what belongs to it
- how other agents reference it
- when it should be refreshed or regenerated

---

## 2. Retrieval-First Interaction Pattern  
Define the rule: **“Never rely on what’s in the chat if it exists in a file.”**  
Before performing work:
- Retrieve needed information from `CONTEXT/domain/`
- Retrieve agent prompts from `CONTEXT/agent/experts/`
- Retrieve workflow docs from `CONTEXT/agent/`

This pattern ensures agents always regenerate internal context from disk, not the chat.

---

## 3. Context Compression Rules (Summaries, Snapshots, Hashes)
Define reusable techniques:
- **Rolling Summaries**: periodically rewrite long-running discussions into concise summaries placed under `tmp/summary-*.md`
- **Content Hashing**: store “context fingerprints” to detect drift or invalidation  
  e.g. `SHA256(REQUEST.md)` stored in `tmp/REQ.hash`
- **State Snapshots**: convert active tasks into structured Markdown files  
  e.g. `tmp/session-<timestamp>.md` instead of carrying long history

---

## 4. Chunked Retrieval Protocol
Provide a protocol for agents:
1. Identify what information the task requires.
2. Retrieve only relevant chunks by referencing filenames or sections.
3. If a file is too large, request or generate a **section summary**.
4. Import only the minimal subset into working memory.

---

## 5. Prompt Reconstruction Pattern  
Agents must reconstruct full prompts from disk, not from conversation memory:
- Rebuild internal system prompt from `experts/<agent>.md`
- Rebuild project state from latest docs in `CONTEXT/domain/`
- Rebuild dev workflow from `AGENTS.md` and `CONTEXT/agent/`

This ensures resilience across sessions and prevents slow “context drift.”

---

## 6. Authority Hierarchy (to avoid hallucination when memory collapses)
Define mandatory priority ordering:

### 1. **Human-edited files override everything**  
### 2. `CONTEXT/domain/` overrides agent interpretation  
### 3. `CONTEXT/agent/experts/` overrides in-chat memories  
### 4. `CONTEXT/agent/` operational docs override ad-hoc instructions  
### 5. Session messages are least authoritative

Agents must explicitly state which layer they rely on for any decision.

---

## 7. Context-Safe Output Patterns  
Provide templates for long tasks:
- “**Chunked Output**” (split multi-step outputs across multiple messages)  
- “**Anchor Referencing**” (link content via stable headings and anchors)
- “**Sectioned Patches**” (avoid mixing unrelated changes in one long block)
- “**Deterministic Regeneration**” (ability to rebuild the same output from scratch)

---

## 8. Auto-Collapse Protocol (when context starts degrading)
Define how an agent detects context collapse:
- repeated clarifications required  
- forgetting file paths  
- incorrect terminology  
- inconsistent reasoning  

When detected, the agent must:
1. Re-read `CONTEXT/domain/`
2. Re-read its own `experts/<agent-id>.md`
3. Load needed workflow docs  
4. Reconstruct missing state from `tmp/` snapshots

This effectively “resets” the agent without losing project memory.

---

## 9. Integration into `AGENTS.md`
The playbook should describe:
- How contributors and agents avoid context spill  
- How new agents should load context  
- Where to store partial summaries  
- How to use `tmp/` as rolling memory  
- How to regenerate lost context via canonical docs

---

## 10. Deliverables
Your final answer should output the strategy in a structured format (Markdown), ready to be saved as:

```

CONTEXT/agent/context-strategy.md

```

and referenced by:
- All agents in `CONTEXT/agent/experts/`
- The “Context Management” section in `AGENTS.md`

Ensure the output is clean, hierarchical, and immediately usable as a developer workflow document.