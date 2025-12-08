import { useMemo, useRef, useState } from 'react';
import type { Operation, StructureKind } from '@ltvis/shared';
import { DemoCanvas } from './viz/DemoCanvas';
import { createRenderer } from './viz/engine';
import { layoutLinear, layoutTree } from './viz/layout';
import type { ViewState } from './viz/types';
import { handleUICommand } from './core/commands';
import { createPlaybackController } from './core/playback';
import { SessionImpl } from './core/session';
import { createEmptyTimeline, flattenSteps } from './core/timeline';

type FormKind = 'LinkedList' | 'SeqList' | 'Stack' | 'BST' | 'Huffman';
type FormOp = 'Create' | 'Insert' | 'Delete' | 'Find' | 'Push' | 'Pop' | 'BuildHuffman';

const demos: Array<{ label: string; name: 'linked-list' | 'bst' | 'huffman' }> = [
  { label: 'Linked List Insert', name: 'linked-list' },
  { label: 'BST Delete', name: 'bst' },
  { label: 'Huffman Build', name: 'huffman' }
];

const cloneViewState = (state: ViewState): ViewState => ({
  nodes: new Map(state.nodes),
  edges: new Map(state.edges),
  meta: { ...state.meta }
});

const autoLayout = (state: ViewState): ViewState => {
  const treeEdge = Array.from(state.edges.values()).some((e) => e.label === 'L' || e.label === 'R');
  return treeEdge ? layoutTree(state) : layoutLinear(state);
};

export default function App() {
  const sessionRef = useRef(new SessionImpl());
  const rendererRef = useRef(createRenderer());
  const playbackRef = useRef(
    createPlaybackController(
      rendererRef.current,
      () => sessionRef.current.getTimeline(),
      (snap) => rendererRef.current.reset(snap),
      {
        onStepApplied: () => {
          syncView();
          const tl = sessionRef.current.getTimeline();
          setTimelineState({ ...tl, entries: [...tl.entries] });
        }
      }
    )
  );

  const [viewState, setViewState] = useState<ViewState>(cloneViewState(rendererRef.current.getState()));
  const [timelineState, setTimelineState] = useState(() => sessionRef.current.getTimeline());
  const [opKind, setOpKind] = useState<FormOp>('Create');
  const [structureKind, setStructureKind] = useState<FormKind>('LinkedList');
  const [targetId, setTargetId] = useState('LL1');
  const [pos, setPos] = useState<string>('0');
  const [value, setValue] = useState<string>('1');
  const [weights, setWeights] = useState<string>('a:5,b:9,c:12');
  const [error, setError] = useState<string | null>(null);

  const syncView = () => {
    setViewState(cloneViewState(autoLayout(rendererRef.current.getState())));
    const tl = sessionRef.current.getTimeline();
    setTimelineState({ ...tl, entries: [...tl.entries] });
  };

  const runOps = (ops: Operation[]) => {
    const prev = cloneViewState(rendererRef.current.getState());
    ops.forEach((op) => {
      const steps = sessionRef.current.executeOperation(op);
      const last = steps[steps.length - 1];
      if (last?.error) {
        setError(last.error.message);
        rendererRef.current.reset();
        prev.nodes.forEach((n) => rendererRef.current.getState().nodes.set(n.id, n));
        prev.edges.forEach((e) => rendererRef.current.getState().edges.set(e.id, e));
        return;
      }
      steps.forEach((s, idx) => rendererRef.current.applyStep(s, idx));
    });
    setError(null);
    syncView();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const kind = structureKind;
    const op: Operation = (() => {
      switch (opKind) {
        case 'Create':
          return {
            kind: 'Create',
            id: targetId,
            structure: kind,
            payload: parsePayload()
          } as Operation;
        case 'Insert':
          return { kind: 'Insert', target: targetId, pos: Number(pos), value: valueOrNumber(value) };
        case 'Delete':
          return { kind: 'Delete', target: targetId, pos: Number(pos) };
        case 'Find':
          return { kind: 'Find', target: targetId, key: valueOrNumber(value) ?? '' };
        case 'Push':
          return { kind: 'Push', target: targetId, value: valueOrNumber(value) ?? '' };
        case 'Pop':
          return { kind: 'Pop', target: targetId };
        case 'BuildHuffman':
          return { kind: 'BuildHuffman', target: targetId, weights: parseWeights(weights) };
        default:
          return { kind: 'Find', target: targetId, key: valueOrNumber(value) ?? '' };
      }
    })();
    if (op.kind === 'Create') {
      const prev = cloneViewState(rendererRef.current.getState());
      sessionRef.current.addStructure(kind as StructureKind, targetId, (op as any).payload);
      const steps = sessionRef.current.getTimeline().entries.slice(-1)[0]?.steps ?? [];
      const last = steps[steps.length - 1];
      if (last?.error) {
        setError(last.error.message);
        rendererRef.current.reset();
        prev.nodes.forEach((n) => rendererRef.current.getState().nodes.set(n.id, n));
        prev.edges.forEach((e) => rendererRef.current.getState().edges.set(e.id, e));
      } else {
        steps.forEach((s, idx) => rendererRef.current.applyStep(s, idx));
        setError(null);
      }
      syncView();
    } else {
      runOps([op]);
    }
  };

  const parsePayload = () => {
    if (opKind === 'Create' && structureKind === 'Huffman') return parseWeights(weights);
    const nums = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map(valueOrNumber)
      .filter((v) => v !== null) as Array<string | number>;
    return nums;
  };

  const valueOrNumber = (val: string): string | number | undefined => {
    if (!val) return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? num : val;
  };

  const parseWeights = (raw: string): Record<string, number> => {
    const res: Record<string, number> = {};
    raw.split(',').forEach((pair) => {
      const [k, v] = pair.split(':').map((x) => x.trim());
      if (k && v && Number.isFinite(Number(v))) res[k] = Number(v);
    });
    return res;
  };

  const handleDemo = (name: 'linked-list' | 'bst' | 'huffman') => {
    handleUICommand(sessionRef.current, playbackRef.current, { type: 'LoadDemo', name });
    const steps = flattenSteps(sessionRef.current.getTimeline());
    steps.forEach((s, idx) => rendererRef.current.applyStep(s, idx));
    syncView();
  };

  const onPlayback = (action: 'play' | 'pause' | 'stepForward' | 'stepBack') => {
    handleUICommand(sessionRef.current, playbackRef.current, { type: 'Playback', action });
  };

  return (
    <main className="app">
      <header className="app__header">
        <p className="eyebrow">Phase 5 shell</p>
        <h1>LT-Vis Playground</h1>
        <p className="lede">Model + renderer + timeline, ready for classroom demos.</p>
      </header>

      <section className="card">
        <h2>Commands</h2>
        <form className="form" onSubmit={onSubmit}>
          <label className="form__row">
            Structure
            <select value={structureKind} onChange={(e) => setStructureKind(e.target.value as FormKind)}>
              <option>LinkedList</option>
              <option>SeqList</option>
              <option>Stack</option>
              <option>BST</option>
              <option>Huffman</option>
            </select>
          </label>
          <label className="form__row">
            Operation
            <select value={opKind} onChange={(e) => setOpKind(e.target.value as FormOp)}>
              <option>Create</option>
              <option>Insert</option>
              <option>Delete</option>
              <option>Find</option>
              <option>Push</option>
              <option>Pop</option>
              <option>BuildHuffman</option>
            </select>
          </label>
          <label className="form__row">
            Target ID
            <input value={targetId} onChange={(e) => setTargetId(e.target.value)} />
          </label>
          <label className="form__row">
            Position/Key
            <input value={pos} onChange={(e) => setPos(e.target.value)} />
          </label>
          <label className="form__row">
            Value/Payload
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="1,2,3" />
          </label>
          {structureKind === 'Huffman' && (
            <label className="form__row">
              Weights (key:weight,...)
              <input value={weights} onChange={(e) => setWeights(e.target.value)} />
            </label>
          )}
          <button type="submit">Run</button>
        </form>
        {error && <p className="error">Error: {error}</p>}
        <div className="pill-row">
          {demos.map((d) => (
            <button key={d.name} className="pill" onClick={() => handleDemo(d.name)}>
              Load {d.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Playback</h2>
        <div className="pill-row">
          <button onClick={() => onPlayback('play')}>Play</button>
          <button onClick={() => onPlayback('pause')}>Pause</button>
          <button onClick={() => onPlayback('stepBack')}>Step Back</button>
          <button onClick={() => onPlayback('stepForward')}>Step Forward</button>
        </div>
        <div className="pill-row">
          <label className="form__row">
            Jump to step
            <input
              type="number"
              min={0}
              max={Math.max(timelineState.totalSteps - 1, 0)}
              onChange={(e) => {
                const idx = Number(e.target.value);
                playbackRef.current.jumpTo(idx);
              }}
            />
          </label>
          <label className="form__row">
            Speed
            <select onChange={(e) => playbackRef.current.setSpeed(Number(e.target.value))}>
              <option value="0.5">0.5x</option>
              <option value="1" defaultChecked>
                1x
              </option>
              <option value="2">2x</option>
            </select>
          </label>
        </div>
        <p className="muted">
          Step {Math.max(timelineState.currentStepIndex, 0)} / {Math.max(timelineState.totalSteps - 1, 0)}
        </p>
        <p className="muted">Current explain: {viewState.meta.explain ?? '—'}</p>
        <p className="muted">Current tip: {viewState.meta.currentTip ?? '—'}</p>
        <div className="pill-row">
          <button
            onClick={() => {
              sessionRef.current = new SessionImpl();
              rendererRef.current = createRenderer();
              playbackRef.current = createPlaybackController(
                rendererRef.current,
                () => sessionRef.current.getTimeline(),
                (snap) => rendererRef.current.reset(snap),
                {
                  onStepApplied: () => {
                    syncView();
                    const tl = sessionRef.current.getTimeline();
                    setTimelineState({ ...tl, entries: [...tl.entries] });
                  }
                }
              );
              setError(null);
              setViewState(cloneViewState(rendererRef.current.getState()));
              setTimelineState(createEmptyTimeline());
            }}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Canvas</h2>
        <DemoCanvas state={viewState} />
      </section>
    </main>
  );
}
