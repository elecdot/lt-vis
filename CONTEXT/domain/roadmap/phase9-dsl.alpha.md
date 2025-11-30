Nice, DSL time 😈

Let’s zoom into **Phase 9 — DSL v0.1**, building on REQUEST §11 and the existing Session/Command path.

---

## 9. Phase 9 — DSL v0.1 (Detailed Roadmap)

> Canonical DSL v0.1 plan. The former `phase9-dsl.beta.md` content is merged here; use this document as the single source of truth for DSL grammar/AST/semantics.

### 9.0 Goals

By the end of this phase you should have:

- A **TypeScript DSL module** that:
    
    - Parses a small script language per REQUEST §11.
        
    - Produces a validated sequence of `Operation` objects (and optional viz commands).
        
    - Provides good **error messages** (line/column, hints).
        
- A **DSL editor panel in the UI** where:
    
    - User writes DSL script.
        
    - Clicks **Validate** to see parse/semantic feedback.
        
    - Clicks **Execute** to feed `Operation[]` to `Session` via the existing command path.
        

In other words: “type script → press run → structures + timeline appear”, without touching low-level forms.

---

## 9.1 Design & Placement (do this first)

**Where it lives**

- New package (recommended):
    
    ```text
    packages/lang-dsl/
      src/
        lexer.ts
        parser.ts
        ast.ts
        semantic.ts
        to-ops.ts
        index.ts
      test/
        lexer.test.ts
        parser.test.ts
        semantic.test.ts
        integration.test.ts
    ```
    
- Or, if you want to keep it simple: `apps/web/src/lang/dsl/*`.  
    For future reuse, package form is cleaner.
    

**Dependencies**

- Language package depends only on:
    
    - `@ltvis/shared` (for `Operation`, `StructureKind`, etc.).
        
    - Chevrotain (or similar) for lexer/parser.
        
- It must **not** depend on React, Session, Renderer, or UI.
    

**Public API (first sketch)**

```ts
// packages/lang-dsl/src/index.ts

export interface DSLParseError {
  message: string;
  line: number;
  column: number;
  snippet?: string;
  hint?: string;
}

export type VizCommand =
  | { type: "Play" }
  | { type: "Pause" }
  | { type: "Step" }
  | { type: "Speed"; value: number };

export interface DSLProgram {
  operations: Operation[];
  vizCommands: VizCommand[]; // can be ignored by v0 UI if needed
  version?: string;          // e.g. "v0.1"
}

export function parseDSL(source: string): { ok: true; ast: ProgramAST } | { ok: false; errors: DSLParseError[] };

export function compileDSL(
  source: string,
  context?: { knownStructures?: string[] }
): { ok: true; program: DSLProgram } | { ok: false; errors: DSLParseError[] };
```

This aligns with REQUEST §11.1–11.4: lex/parse → AST → semantic → Operation[].

**Acceptance**

- `compileDSL` can be used from both:
    
    - UI (DSL panel).
        
    - Tests / batch scripts (headless).
        

---

## 9.2 Step 1 — AST & Type Shapes

Start by encoding §11.2 AST nodes.

```ts
// ast.ts

export type Value = number | string | Identifier;

export interface Identifier {
  kind: "Identifier";
  name: string;
  loc?: SourceLoc;
}

export type TypeName = "list-seq" | "list-linked" | "stack" | "bst" | "btree" | "huffman"; // extend when AVL lands in Phase 8

export interface CreateNodeAST {
  kind: "Create";
  type: TypeName;
  id?: string;
  payload?: any; // list or map; we’ll type-refine later
}

export interface InsertAST {
  kind: "Insert";
  target: string; // structure id only
  pos?: number;
  value?: Value;
}

export interface DeleteAST {
  kind: "Delete";
  target: string; // structure id only
  key?: Value;
  pos?: number;
}

export interface FindAST {
  kind: "Find";
  target: string; // structure id only
  key?: Value;
}

export interface PushAST {
  kind: "Push";
  target: string; // structure id only
  value?: Value;
}

export interface PopAST {
  kind: "Pop";
  target: string; // structure id only
}

export interface BuildHuffmanAST {
  kind: "BuildHuffman";
  target: string; // id
  weights: Record<string, number>;
}

export type VizAST =
  | { kind: "Play" }
  | { kind: "Pause" }
  | { kind: "Step" }
  | { kind: "Speed"; value: number };

export type StmtAST =
  | CreateNodeAST
  | InsertAST
  | DeleteAST
  | FindAST
  | PushAST
  | PopAST
  | BuildHuffmanAST
  | VizAST
  | { kind: "Comment"; text: string };

export interface ProgramAST {
  version?: string;  // from "# DSL v0.1" header optionally
  stmts: StmtAST[];
}

export interface SourceLoc {
  line: number;
  column: number;
}
```

**Acceptance**

- AST module compiles and has unit tests that construct example ASTs manually (no parser yet).

- Every AST node should carry a `loc` (line/column) to support consistent error reporting downstream.
    

---

## 9.3 Step 2 — Lexer (tokens aligned with EBNF)

Implement tokenization based on REQUEST §11.1 EBNF.

Key tokens:

- Keywords: `create`, `list`, `seq`, `linked`, `stack`, `bst`, `btree`, `huffman`, `insert`, `delete`, `find`, `push`, `pop`, `build`, `at`, `value`, `key`, `play`, `pause`, `step`, `speed`.
    
- Punctuation: `[`, `]`, `{`, `}`, `:`, `,`.
    
- `NUMBER`
    
- `STRING`
    
- `ID` (identifiers, keys)
    
- `COMMENT` (lines starting with `#`)
    
- `WS` (skipped)

> v0.1 intentionally omits `include`/file imports; scripts are self-contained.
    

**Work items**

- Define tokens in `lexer.ts`.
    
- Provide a small helper:
    
    ```ts
    export function tokenize(source: string): { tokens: IToken[]; errors: DSLParseError[] };
    ```
    
- Make comments and whitespace **skipped** tokens.
    

**Tests**

- Round-trip tokenization for small scripts, e.g.:
    
    ```dsl
    # DSL v0.1
    create list linked L [1,3,4]
    insert L at 1 value 2
    play
    ```
    
- Assert token types/values roughly match expectations.
    

**Acceptance**

- Tokenizer produces correct tokens & locations (line/col) for later error reporting.
    

---

## 9.4 Step 3 — Parser (program → AST)

Implement parser grammar matching the EBNF (REQUEST §11.1):

- `program := stmt* EOF`
    
- `stmt := create_stmt | op_stmt | viz_stmt | comment`
    
- etc.
    

**Work items**

- In `parser.ts`, define Chevrotain parser:
    
    - Rules:
        
        - `program()`
            
        - `stmt()`
            
        - `create_stmt()`
            
        - `op_stmt()`
            
        - `viz_stmt()`
            
        - `list_payload()`, `map_payload()`, `values()`, `kvpairs()`, etc.
            
    - Map tokens to AST nodes from §9.2:
        
        - `create list linked L [1,3,4]` → `Create { type: "list-linked", id: "L", payload: [1,3,4] }`
            
        - `insert L at 1 value 2` → `Insert { target: "L", pos: 1, value: 2 }`
            
        - `build huffman H { a:5, b:9 }` → `BuildHuffman { target: "H", weights: { a:5, b:9 } }`
            
        - `play` → `VizAST { kind: "Play" }`
            
- Comments:
    
    - For v0.1, you can parse comments into `Comment` AST or completely ignore them.
        
    - Keep at least version header `# DSL v0.1` if you want to store it in `ProgramAST.version`.
        

**Tests**

- `parser.test.ts`:
    
    - For each example script (linked list, BST, Huffman):
        
        - Parse → AST.
            
        - Assert `ast.stmts` length & structure.
            
    - Negative tests:
        
        - Missing closing bracket, unknown keyword, etc., must produce parse errors.
            

**Acceptance**

- `parseDSL(source)` returns a `ProgramAST` or structured errors for malformed input.
    
- Grammar matches REQUEST’s EBNF (no “surprise syntax”).
    

---

## 9.5 Step 4 — Semantic Analysis (resolve IDs, types, payloads)

Parser only checks syntax; now make it **semantically valid** before generating `Operation[]`.

**Goals**

- Resolve **structure IDs** and **types**.
    
- Validate payload shapes for each structure kind.
    
- Catch:
    
    - Using unknown target.
        
    - Duplicated `create` for same ID (if disallowed).
        
    - Using type name as target without prior `create` when that’s not allowed.
        

**Work items**

In `semantic.ts`:

1. **Symbol table**
    
    ```ts
    interface StructSymbol {
      id: string;
      type: TypeName;
    }
    
    export interface SemanticContext {
      structById: Map<string, StructSymbol>;
      // maybe default names for type targets: "list", "bst", etc.
    }
    ```
    
2. **Pass 1: collect creates**
    
    - Walk `ProgramAST.stmts`.
        
- For each `Create`:
        
        - Require an explicit `id` in v0.1 (no implicit type-named structures).
            
        - Check duplicates → error.
            
3. **Pass 2: validate ops**
    
    - For each `Insert`, `Delete`, `Find`, `Push`, `Pop`, `BuildHuffman`:
        
        - Resolve `target`:
            
            - Must be a structure id registered via `create`; type-name targets are **not** allowed in v0.1.
                
        - Validate fields:
            
            - `Insert`:
                
                - Lists: `pos` optional? you can define default (append) or require explicit.
                    
                - Value required.
                    
            - `Delete`:
                
                - For lists: use `pos`.
                    
                - For BST: use `key`.
                    
            - `BuildHuffman`:
                
                - `weights` non-empty.
                    
                - All values numbers.
                    
    - Collect `SemanticError`:
        
        ```ts
        export interface SemanticError extends DSLParseError {
          phase: "semantic";
        }
        ```
        
4. **Output**
    
    - If any semantic errors → return `errors`.
        
    - Otherwise, return enriched AST or separate IR structure that is ready to turn into `Operation[]`.
        

**Tests**

- Scripts with unknown target IDs.
    
- Missing payloads (e.g. `insert L at 1` without `value`).
    
- Wrong combination of key/pos for structure types (e.g. `delete L key 7` on a list).
    

**Acceptance**

- Semantic pass catches obvious misuse with clear error messages.
    
- Example scripts (from REQUEST) pass semantic check without error.
    

---

## 9.6 Step 5 — AST → Operation[] (core compilation)

Now map valid AST into `Operation[]` for Session.

**Work items**

In `to-ops.ts`:

1. **Type mapping**
    
    - Map `TypeName` → `Operation.structureKind`:
        
        - `"list-seq"` → `"SeqList"`
            
        - `"list-linked"` → `"LinkedList"`
            
        - `"stack"` → `"Stack"`
            
        - `"bst"` → `"BST"`
            
        - `"btree"` → `"BinaryTree"`
            
        - `"huffman"` → `"Huffman"`
            
2. **Create → Operation**
    
    ```ts
    function fromCreate(ast: CreateNodeAST): Operation {
      return {
        kind: "Create",
        target: ast.id!, // assume semantic ensured this
        structure: mapType(ast.type),
        payload: ast.payload, // list or map
      };
    }
    ```
    
3. **Insert/Delete/Find/Push/Pop → Operation**
    
    - `InsertAST`:
        
        ```ts
        { kind: "Insert", target: resolvedId, pos: ast.pos, value: normalizeValue(ast.value) }
        ```
        
    - `DeleteAST` (list & BST differences):
        
        ```ts
        if (type is list) {
          // use pos
          return { kind: "Delete", target: resolvedId, pos: ast.pos };
        } else if (type is bst) {
          return { kind: "Delete", target: resolvedId, key: valueToNumber(ast.key) };
        }
        ```
        
    - `BuildHuffmanAST`:
        
        ```ts
        { kind: "BuildHuffman", target: ast.target, weights: ast.weights }
        ```
        
4. **VizAST → VizCommand**
    
    - Map:
        
        - `Play` → `{ type: "Play" }`
            
        - `Pause` → `{ type: "Pause" }`
            
        - `Step` → `{ type: "Step" }`
            
        - `Speed` → `{ type: "Speed", value: ast.value }`
            
    - For v0.1 UI, you can:
        
        - Either ignore these.
            
        - Or treat them as future hints (e.g., auto-play after script).
            
5. **Compile function**
    
    ```ts
    import { ProgramAST } from "./ast";
    
    export function astToProgram(ast: ProgramAST): DSLProgram {
      const operations: Operation[] = [];
      const vizCommands: VizCommand[] = [];
    
      for (const stmt of ast.stmts) {
        switch (stmt.kind) {
          case "Create": operations.push(fromCreate(stmt)); break;
          case "Insert": operations.push(fromInsert(stmt)); break;
          // ...
          case "Play":
          case "Pause":
          case "Step":
          case "Speed":
            vizCommands.push(fromViz(stmt));
            break;
        }
      }
    
      return { operations, vizCommands, version: ast.version };
    }
    ```
    

**Tests**

- For linked-list script:
    
    ```dsl
    create list linked L [1,3,4]
    insert L at 1 value 2
    ```
    
    - Compile → `operations.length === 2`.
        
    - First op kind `'Create'`, second `'Insert'` with correct target/payload.
        
- For BST delete script.
    
- For Huffman script.
    

**Acceptance**

- Known DSL examples compile into `Operation[]` that match those you would create manually from the UI.
    
- No DSL logic leaks into Session or Renderer; Program just feeds Operations.
    

---

## 9.7 Step 6 — Error Reporting & Developer UX

You want nice errors in the UI and tests.

**Work items**

1. **Normalize errors**
    
    - Combine lexer/kernel errors, parser errors, semantic errors into a standard `DSLParseError` structure.
        
    - Each error should have:
        
        - `message`
            
        - `line`, `column`
            
        - `snippet` (the line of code)
            
        - `hint` (optional suggestion)
            
2. **Error classes**
    
    - E.g., `MissingValueError`, `UnknownTargetError`, `DuplicateIdError`, `UnexpectedTokenError` — but all surface as `DSLParseError`.
        
3. **Unit tests**
    
    - Scripts with known mistakes:
        
        - `create list L [1,2` (missing bracket).
            
        - `insert Unknown at 1 value 2`.
            
        - `build huffman H { a:foo }`.
            
    - Assert that `compileDSL` returns `ok: false` and errors with proper line/column/hints.
        

**Acceptance**

- Error messages are good enough that a student can fix a script without reading code.
    
- Line/column indicators match actual source positions.
    

---

## 9.8 Step 7 — UI Integration (DSL Panel → Session)

Now plug it into `apps/web`.

**Work items**

1. **DSL Panel component**
    
    - `DSLPanel.tsx` (likely in UI Phase 8, but we define here):
        
        - Text area (or code editor).
            
        - Buttons:
            
            - “Validate”: `compileDSL(source)` and show errors/success.
                
            - “Execute”: on success:
                
                - For now, ignore `vizCommands`.
                    
                - For each `Operation` in `program.operations`, dispatch:
                    
                    ```ts
                    dispatch({ type: "RunOperation", op });
                    ```
                    
                - Optionally:
                    
                    - If there’s a `Play` viz command, auto trigger playback at the end.
                        
        - Show errors in a list with line/col and message (click to focus line).
            
2. **Context wiring**
    
    - Use `CoreContext` from earlier phases:
        
        ```ts
        const { dispatch } = useCore();
        ```
        
3. **Presets as DSL**
    
    - Provide the three core demos as **DSL scripts**:
        
        - Linked list insert script.
            
        - BST delete script.
            
        - Huffman script.
            
    - “Load as example” buttons that drop them into the DSL editor.
        

**Acceptance**

- Instructor can:
    
    - Paste a DSL script.
        
    - Click “Execute”.
        
    - See structures and timeline update as if they used the UI forms.
        
- Core examples from REQUEST.md are reproducible purely via DSL.
    

---

## 9.9 Step 8 — Integration & Round-Trip Tests

**Goals**

- Ensure that DSL and UI/forms generate **equivalent behavior**.
    
- Lock DSL into CI.
    

**Work items**

1. **Round-trip integration test (headless)**
    
    - For each example:
        
        - Use `compileDSL` to get `program.operations`.
            
        - Feed `Operation[]` to `Session.executeOperation` sequentially.
            
        - Compare:
            
            - Final snapshots vs reference “ground truth” snapshot.
                
            - OpStep sequences vs those from a manually constructed `Operation[]` (or at least same final result).
                
2. **E2E test with UI**
    
    - Use Playwright to:
        
        - Open app, go to DSL panel.
            
        - Paste example script.
            
        - Click Execute.
            
        - Click Play (if not auto-play).
            
        - Assert final DOM representation matches expectations (e.g. node labels).
            
3. **Versioning**
    
    - Require `# DSL v0.1` at top or treat it as optional comment with version detection.
        
    - Store version in `ProgramAST.version` and carry it into `DSLProgram.version`.
        

**Acceptance**

- CI runs DSL unit tests + integration tests.
    
- At least 1 E2E test uses DSL → Operations → Session → Renderer pipeline.
    
- DSL v0.1 behavior is stable enough to be demoed and used in homework.
    

---

## 9.10 Phase 9 Done-ness Checklist

You can call Phase 9 “done” when:

-  `packages/lang-dsl` (or equivalent) exists and builds.
    
-  Lexer & Parser:
    
    -  Implement EBNF from REQUEST §11.1.
        
    -  Handle comments, whitespace, and strings/numbers/ids correctly.
        
-  AST & Semantic:
    
    -  AST types reflect §11.2.
        
    -  Semantic pass resolves IDs/types and validates payloads.
        
    -  DSL v0.1 rules enforced: scripts are self-contained, require explicit structure IDs, and do not support `include`.
        
-  Compilation:
    
    -  `compileDSL` returns a `DSLProgram` with `Operation[]` and `VizCommand[]`.
        
    -  Known examples compile and execute correctly in headless tests.
        
-  Error reporting:
    
    -  Errors have line/column/snippet/hints.
        
    -  Malformed scripts fail with meaningful messages.
        
-  UI integration:
    
    -  DSL editor panel exists with Validate/Execute.
        
    -  Instructor can reproduce linked-list, BST, Huffman examples via DSL only.
        
-  CI:
    
    -  DSL unit tests + integration tests wired into pipeline.
