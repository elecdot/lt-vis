import { demoOperations, demoStep } from './demoData';

export default function App() {
  return (
    <main className="app">
      <header className="app__header">
        <p className="eyebrow">Phase 0–1 scaffold</p>
        <h1>LT-Vis Web Shell</h1>
        <p className="lede">
          Vite + React are wired up. Shared contracts load, and timeline data will feed the renderer
          in later phases.
        </p>
      </header>

      <section className="card">
        <h2>Demo Operations</h2>
        <ul className="list">
          {demoOperations.map((op, idx) => (
            <li key={idx} className="list__item">
              <code>{op.kind}</code>
              <span className="muted">
                {op.kind === 'Create'
                  ? `${op.structure} ${op.id}`
                  : `${op.target}${op.pos !== undefined ? ` @ ${op.pos}` : ''}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Sample Timeline Step</h2>
        <p className="muted">{demoStep.explain}</p>
        <div className="pill-row">
          <span className="pill">{demoStep.events.length} events</span>
          <span className="pill">{demoStep.snapshot.nodes.length} nodes</span>
          <span className="pill">{demoStep.snapshot.edges.length} edges</span>
          <span className="pill">selection: {demoStep.snapshot.meta?.selection}</span>
        </div>
      </section>
    </main>
  );
}
