Alright, Phase 10 time — **NL → DSL bridge**.

This one is explicitly **optional / researchy**, so the design must be **sandboxed**: if it breaks or is disabled, the rest of LT-Vis still works perfectly.

---

## 10. Phase 10 — Natural Language → DSL (C-13)

### 10.0 Goals

By the end of Phase 10 you should be able to:

- Take a short **natural language prompt**, e.g.:
    
    > “Create a BST with [5,3,7,2,4,6,8] and delete 7”
    
- Produce **one or more candidate DSL scripts** (as plain text).
    
- **Validate** those scripts using the existing DSL pipeline (parse → sema → compile).
    
- Present candidates to the user for **human confirmation/editing** before execution.
    
- Log NL ↔ DSL ↔ operations mappings for future analysis.
    

Critically:

- NL feature is **non-blocking**:
    
    - If the NL part is broken/disabled, DSL editor + UI + core still work.
        
    - No auto-execution — user must confirm.
        

This fulfills C-13: “NL→DSL prototype with human confirmation”.

---

## 10.1 High-Level Architecture

We reuse Phase 9’s DSL pipeline and only add a thin layer on top:

```text
Natural Language
    ↓
NLService (LLM / rules / template) → candidate DSL scripts
    ↓
For each candidate:
    parse → sema → compile  (existing DSL pipeline)
    ↓
Filter / rank / present to user
    ↓
User picks / edits → Run DSL (Phase 9 path)
```

New pieces:

- `NLService` interface and adapter.
    
- `nl-dsl` orchestration module.
    
- UI for NL prompt + candidate selector.
    
- Logging of NL→DSL attempts.
    

---

## 10.2 Interface: NLService (abstract adapter)

**Goal:** Treat the NL→DSL generator as a pluggable component. You don’t hard-bind to any specific LLM or API in core code.

In `apps/web/src/nl/nl-service.ts`:

```ts
export interface NLToDSLRequest {
  prompt: string;
  context?: {
    // e.g. active structure kind, examples, existing script prefix
    activeKind?: string;       // "BST" | "LinkedList" | ...
  };
}

export interface NLToDSLCandidate {
  dsl: string;
  score?: number;
  reasoning?: string;          // optional explanation
}

export interface NLToDSLResponse {
  candidates: NLToDSLCandidate[];
  raw?: unknown;               // raw provider response (for debugging)
}

export interface NLService {
  generate(request: NLToDSLRequest): Promise<NLToDSLResponse>;
}
```

Then implement a default **stub** adapter:

```ts
export class StubNLService implements NLService {
  async generate(req: NLToDSLRequest): Promise<NLToDSLResponse> {
    // Minimal heuristic: try to detect "BST", "list", numbers, "delete", etc.
    // For now, can simply return an empty candidate list or a trivial placeholder.
    return { candidates: [] };
  }
}
```

> Keep this interface aligned with the shared `NlpService` port (Phase 12) so the UI can swap stub/local vs HTTP adapters without redefining types.

Later, you can plug in a real LLM-backed implementation **without changing the rest of the app**.

**Acceptance checks**

- `NLService` is an interface; core code depends only on it, not on specific AI implementation.
    
- Stub version is safe and never executes anything by itself.
    

---

## 10.3 NL → DSL Orchestration (reuse DSL pipeline)

**Goal:** Build a small orchestrator that:

1. Calls `NLService`.
    
2. Validates each candidate DSL script through Phase 9’s pipeline.
    
3. Returns only **valid** candidates + associated metadata.
    

Create `apps/web/src/nl/nl-dsl.ts`:

```ts
import { compileDSL } from "@ltvis/lang-dsl"; // from Phase 9
import { Operation } from "@ltvis/shared";
import { NLService, NLToDSLRequest, NLToDSLCandidate } from "./nl-service";

export interface NLDSLCandidate {
  dsl: string;
  operations: Operation[];
  parseErrors: any[];    // ideally typed
  semaErrors: any[];
}

export interface NLDSLResult {
  candidates: NLDSLCandidate[];
}

export async function nlToDsl(
  service: NLService,
  req: NLToDSLRequest,
  maxCandidates = 3
): Promise<NLDSLResult> {
  const { candidates } = await service.generate(req);

  const results: NLDSLCandidate[] = [];

  for (const c of candidates.slice(0, maxCandidates)) {
    const res = compileDSL(c.dsl);
    results.push({
      dsl: c.dsl,
      operations: res.ok ? res.program.operations : [],
      parseErrors: res.ok ? [] : res.errors?.filter(e => e.phase === "parse") ?? [],
      semaErrors: res.ok ? [] : res.errors?.filter(e => e.phase === "semantic") ?? [],
    });
  }

  return { candidates: results };
}
```

**Key points:**

- **No candidate is “trusted”** until it passes parse+sema.
    
- Even for valid ones, you still don’t auto-run them; you present them to the user.
    

**Acceptance checks**

- Given a hand-crafted `NLService` that returns a DSL snippet, `nlToDsl`:
    
    - Runs it through DSL pipeline.
        
    - Distinguishes valid vs errorful candidates.
        
- If all candidates fail, you still give the user clear feedback (“all candidates invalid”).
    

---

## 10.4 Command & Core Integration

**Goal:** Integrate NL→DSL into the existing `UICommand` / Session path, but keep it optional.

In `core/commands.ts`, extend `UICommand`:

```ts
export type UICommand =
  | { type: "RunDSL"; source: string }
  | { type: "NLGenerateDSL"; prompt: string }  // new
  | { type: "RunDSLCandidate"; dsl: string }
  | /* existing commands... */;
```

We’ll treat this split like:

- `NLGenerateDSL` → _generate and show candidates_ (no execution).
    
- `RunDSLCandidate` → _execute a specific DSL script_ (user confirmed).
    

In `handleUICommand`:

```ts
export function handleUICommand(ctx: CommandContext, cmd: UICommand): void {
  switch (cmd.type) {
    case "NLGenerateDSL": {
      ctx.runNLToDSL(cmd.prompt);  // this will call nlToDsl and update React state
      break;
    }
    case "RunDSLCandidate": {
      // same as RunDSL but with explicit candidate source
      ctx.runDSL(cmd.dsl);
      break;
    }
    // ... existing cases
  }
}
```

Where `CommandContext` is extended with:

```ts
export interface CommandContext {
  session: Session;
  playback: PlaybackController;
  renderer: Renderer;
  dsl: {
    runScript: (source: string) => void;
    showErrors: (errors: DSLErrors) => void;
  };
  nl: {
    service: NLService; // implement via the shared NlpService port (Phase 12) or a stub by default
    setCandidates: (candidates: NLDSLCandidate[]) => void;
  };
}
```

**Acceptance checks**

- NL→DSL flow is **composed** out of existing DSL path (`RunDSL`), not re-implementing anything.
    
- NL feature is off by default if `nl.service` is the stub that returns no candidates.
    

---

## 10.5 UI: NL Prompt + Candidate Picker

**Goal:** Give users a simple NL entry box, show candidate DSLs with summaries, and let them choose.

In `apps/web/src/dsl/nl-panel.tsx`:

1. **NL prompt input**
    
    ```tsx
    function NLPanels() {
      const { dispatch, nlCandidates, nlBusy } = useCore();
      const [prompt, setPrompt] = useState("");
    
      const onGenerate = () => {
        if (!prompt.trim()) return;
        dispatch({ type: "NLGenerateDSL", prompt });
      };
    
      return (
        <div className="nl-panel">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder='e.g. "Create a BST with [5,3,7,2,4,6,8] and delete 7"'
          />
          <button onClick={onGenerate} disabled={nlBusy}>Generate script</button>
    
          <NLCandidateList />
        </div>
      );
    }
    ```
    
2. **Candidate list**
    
    ```tsx
    function NLCandidateList() {
      const { nlCandidates, dispatch } = useCore();
    
      if (!nlCandidates.length) {
        return <p>No candidates yet. Try a prompt above.</p>;
      }
    
      return (
        <div className="nl-candidates">
          {nlCandidates.map((c, idx) => (
            <div key={idx} className="nl-candidate-card">
              <pre className="nl-candidate-dsl">{c.dsl}</pre>
              {c.parseErrors.length || c.semaErrors.length ? (
                <div className="nl-candidate-errors">
                  {/* render list of errors */}
                </div>
              ) : (
                <div className="nl-candidate-actions">
                  <button
                    onClick={() => dispatch({ type: "RunDSLCandidate", dsl: c.dsl })}
                  >
                    Use this script
                  </button>
                  <button
                    onClick={() => dispatch({ type: "OpenDSLInEditor", source: c.dsl })}
                  >
                    Edit in DSL editor
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    ```
    
3. **Integration with DSL editor**
    
    - `OpenDSLInEditor` command can simply set the DSL editor’s source value to the candidate’s DSL.
        
    - This makes the DSL editor and NL panel play nicely together.
        

**Acceptance checks (UI)**

- User can type NL prompt, click “Generate script”, and see candidate DSL blocks.
    
- For valid candidates:
    
    - “Use this script” executes it (via standard DSL path).
        
    - “Edit in DSL editor” switches to DSL panel with script loaded.
        
- For invalid candidates:
    
    - Errors are shown; no Run button is offered or it’s disabled.
        

---

## 10.6 Logging & Research Hooks

**Goal:** Capture interesting data for later analysis (outside core feature set).

### 10.6.1 What to log

In a simple `nl-logs.ts` module:

- For each NL→DSL run:
    
    ```ts
    export interface NLLogEntry {
      id: string;
      timestamp: string;
      prompt: string;
      candidates: {
        dsl: string;
        valid: boolean;
        parseErrors?: SemaError[];
        semaErrors?: SemaError[];
      }[];
      chosenIndex?: number;
    }
    ```
    
- Store in:
    
    - `localStorage` (simple) as a rotating buffer; and/or
        
    - Allow exporting logs as a JSON file via a hidden dev/debug UI.
        

### 10.6.2 Why log?

- To evaluate how well your NL→DSL prompts work.
    
- To build better heuristics or prompt templates later.
    
- To help debug misinterpretations.
    

**Acceptance checks**

- Logs are optional and disabled or bounded (e.g. at most N entries).
    
- Export mechanism exists for devs (not required for students).
    

---

## 10.7 Safety & Failure Modes

**Goal:** Ensure NL feature cannot break the rest of the system.

Key design choices:

1. **No automatic execution**
    
    - NL → DSL just generates _candidates_.
        
    - Only user click on “Use this script / Run” triggers execution.
        
2. **Full validation**
    
    - Every candidate is validated via parse+sema before being shown as “valid”.
        
    - Invalid candidates are clearly marked and not executable.
        
3. **Graceful failure**
    
    - If `NLService.generate()` throws or returns nothing:
        
        - Show “Couldn’t generate scripts; you can still use the DSL editor directly.”
            
        - Do not crash; leave DSL editor intact.
            
4. **Feature gating**
    
    - Provide a config flag like `enableNLBridge`:
        
        - If false, hide NL panel entirely.
            
        - DSL editor and everything else still available.
            

**Acceptance checks**

- If NL backend is down/unimplemented:
    
    - No JS errors.
        
    - Only visible effect: candidate list stays empty + user can still script via DSL.
        
- When candidate DSL is invalid:
    
    - UI shows parse/sema errors.
        
    - No operations executed.
        

---

## 10.8 Tests & Phase 10 Done-ness Checklist

### 10.8.1 Tests

1. **Unit tests for orchestration (`nl-dsl.ts`)**
    
    - With a fake `NLService` that returns known DSL:
        
        - Valid DSL → `nlToDsl` returns candidate with empty parse/sema errors.
            
        - Invalid DSL → candidate with appropriate errors.
            
    - With empty candidate list:
        
        - `nlToDsl` returns empty result gracefully.
        
    - Keep a reusable fake service fixture under `apps/web/src/nl/__fixtures__/fakeNlService.ts` (or similar) and use it for both unit and E2E tests to avoid ad-hoc mocks.
            
2. **Command tests**
    
    - `UICommand.NLGenerateDSL` updates `nlCandidates` state (with mocked `nlToDsl`).
        
    - `UICommand.RunDSLCandidate` delegates to the **same** DSL execution path as `RunDSL`.
        
3. **UI tests**
    
    - NL panel:
        
        - Typing prompt + clicking “Generate script” calls `NLGenerateDSL`.
            
        - Candidate list renders DSL content and buttons.
            
    - Candidate actions:
        
        - “Run” button issues `RunDSLCandidate`.
            
        - “Edit in DSL editor” pre-fills DSL editor state.
            
4. **E2E smoke**
    
    - With a deterministic fake NLService:
        
        - Example: prompt `"bst [5,3,7,2,4,6,8], delete 7"` → candidate `create bst T [5,3,7,2,4,6,8]\ndelete T key 7`.
            
        - User clicks “Generate script”, sees candidate, clicks “Use this script”.
            
        - Canvas shows same result as direct BST demo.
            

### 10.8.2 “Done” Checklist

You can call Phase 10 complete when:

-  `NLService` interface + stub implementation exist.
    
-  `nlToDsl()` orchestrator is implemented and tested.
    
-  `UICommand.NLGenerateDSL` and `RunDSLCandidate` are wired.
    
-  NL panel:
    
    -  Prompt textarea.
        
    -  “Generate script” button.
        
    -  Candidates list with DSL previews and error messages.
        
    -  Buttons to run or edit candidate scripts.
        
-  Safety:
    
    -  No auto-execution of NL output.
        
    -  All candidates validated via DSL pipeline before execution.
        
    -  Feature can be disabled without breaking DSL or core app.
        
-  Logging (optional but recommended):
    
    -  NL → DSL attempts can be exported as JSON for offline analysis.
        
-  At least one E2E scenario covers NL→DSL→visualization in a controlled environment (with a fake NL service).

**Commands to run**

- `pnpm --filter web test -- nl`
- `pnpm --filter web test:e2e -- --project=chromium` (with fake NL service wired)
