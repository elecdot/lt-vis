import { useMemo, useRef, useState } from 'react';
import type { Operation, StructureKind } from '@ltvis/shared';
import { DemoCanvas } from './viz/DemoCanvas';
import { createRenderer } from './viz/engine';
import { layoutLinear, layoutTree } from './viz/layout';
import type { ViewState } from './viz/types';
import { handleUICommand } from './core/commands';
import { createPlaybackController } from './core/playback';
import { SessionImpl } from './core/session';
import { createEmptyTimeline } from './core/timeline';

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
    createPlaybackController(rendererRef.current, () => sessionRef.current.getTimeline(), (snap) => rendererRef.current.reset(snap))
  );

  const [viewState, setViewState] = useState<ViewState>(cloneViewState(rendererRef.current.getState()));
  const [opKind, setOpKind] = useState<FormOp>('Create');
  const [structureKind, setStructureKind] = useState<FormKind>('LinkedList');
  const [targetId, setTargetId] = useState('LL1');
  const [pos, setPos] = useState<string>('0');
  const [value, setValue] = useState<string>('1');
  const [weights, setWeights] = useState<string>('a:5,b:9,c:12');

  const refreshView = () => {
    setViewState(cloneViewState(autoLayout(rendererRef.current.getState())));
  };

  const runOps = (ops: Operation[]) => {
    ops.forEach((op) => {
      const steps = sessionRef.current.executeOperation(op);
      steps.forEach((s, idx) => rendererRef.current.applyStep(s, idx));
    });
    refreshView();
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
      sessionRef.current.addStructure(kind, targetId, (op as any).payload);
      const steps = sessionRef.current.getTimeline().entries.slice(-1)[0]?.steps ?? [];
      steps.forEach((s, idx) => rendererRef.current.applyStep(s, idx));
      refreshView();
    } else {
      const steps = sessionRef.current.executeOperation(op);
      steps.forEach((s, idx) => rendererRef.current.applyStep(s, idx));
      refreshView();
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
    const steps = sessionRef.current.getTimeline().entries.slice(-1)[0]?.steps ?? [];
    steps.forEach((s, idx) => rendererRef.current.applyStep(s, idx));
    refreshView();
  };

  const onPlayback = (action: 'play' | 'pause' | 'stepForward' | 'stepBack') => {
    handleUICommand(sessionRef.current, playbackRef.current, { type: 'Playback', action });
    refreshView();
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
        <p className="muted">Current explain: {viewState.meta.explain ?? '—'}</p>
        <p className="muted">Current tip: {viewState.meta.currentTip ?? '—'}</p>
      </section>

      <section className="card">
        <h2>Canvas</h2>
        <DemoCanvas state={viewState} />
      </section>
    </main>
  );
}
