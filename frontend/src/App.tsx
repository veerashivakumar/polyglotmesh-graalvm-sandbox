import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ApiError, fetchHealth, fetchRuntimeCapabilities, type RuntimeCapabilities } from './api/health';
import { RuntimeCapabilitiesPanel, type CapabilityViewState } from './RuntimeCapabilitiesPanel';
import { StudioCanvas } from './StudioCanvas';
const CrystalCanvas = lazy(() => import('./CrystalCanvas').then((module) => ({ default: module.CrystalCanvas })));

type WindowKey = 'hub' | 'ide' | 'security' | 'benchmark' | 'database';
const windows: { key: WindowKey; title: string; icon: string }[] = [
  { key: 'hub', title: 'Runtime Hub', icon: '*' }, { key: 'ide', title: 'Polyglot IDE', icon: '</>' },
  { key: 'security', title: 'Sandbox Isolation', icon: 'S' }, { key: 'benchmark', title: 'Zero-Copy Audit', icon: '0' },
  { key: 'database', title: 'MongoDB & Scripts', icon: 'DB' },
];
const windowTitles = ['GraalVM Polyglot Runtime Hub', 'Multi-Language Polyglot IDE & Console', 'Sandbox Security & Context Isolation', 'Zero-Copy & Latency Benchmarks', 'MongoDB Data Binding & Script Persistence'];

export default function App() {
  const [active, setActive] = useState<WindowKey>('hub');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [connection, setConnection] = useState<'checking' | 'connected' | 'unavailable' | 'unexpected'>('checking');
  const [checkedAt, setCheckedAt] = useState('');
  const [detail, setDetail] = useState('');
  const [runtimeState, setRuntimeState] = useState<CapabilityViewState>('checking');
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities>();
  const [runtimeError, setRuntimeError] = useState('');
  const [crystalPulse, setCrystalPulse] = useState(0);
  const [quickCode, setQuickCode] = useState('console.log(\"Hello PolyglotMesh\");');
  const [dispatchedCode, setDispatchedCode] = useState<string | undefined>();

  const checkConnection = useCallback(async () => {
    setConnection('checking'); setDetail('');
    try { await fetchHealth(); setConnection('connected'); }
    catch (error) { if (error instanceof ApiError) { setConnection(error.kind); setDetail(error.message); } else { setConnection('unexpected'); setDetail('Unexpected backend response.'); } }
    finally { setCheckedAt(new Date().toLocaleTimeString()); }
  }, []);
  useEffect(() => { void checkConnection(); }, [checkConnection]);
  const checkRuntime = useCallback(async () => {
    setRuntimeState('checking'); setRuntimeError('');
    try { const result = await fetchRuntimeCapabilities(); setCapabilities(result); setRuntimeState(result.status === 'INITIALIZED' ? 'ready' : 'unavailable'); }
    catch (error) { setRuntimeState('failed'); setRuntimeError(error instanceof ApiError ? error.message : 'Unexpected runtime response.'); }
  }, []);
  useEffect(() => { void checkRuntime(); }, [checkRuntime]);
  useEffect(() => {
    const timers = new Map<number, HTMLElement>();
    const ripple = (event: PointerEvent) => {
      const ring = document.createElement('span');
      ring.className = 'pastel-ripple';
      ring.style.left = `${event.clientX}px`;
      ring.style.top = `${event.clientY}px`;
      document.body.appendChild(ring);
      const timer = window.setTimeout(() => { ring.remove(); timers.delete(timer); }, 700);
      timers.set(timer, ring);
    };
    document.addEventListener('pointerdown', ripple);
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.pm-tilt-card'));
    const moves = new Map<HTMLElement, (event: PointerEvent) => void>();
    const leaves = new Map<HTMLElement, () => void>();
    cards.forEach((card) => {
      const move = (event: PointerEvent) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -3.5;
        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 3.5;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.008,1.008,1.008)`;
      };
      const leave = () => { card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'; };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      moves.set(card, move); leaves.set(card, leave);
    });
    return () => {
      document.removeEventListener('pointerdown', ripple);
      timers.forEach((ring, timer) => { window.clearTimeout(timer); ring.remove(); });
      cards.forEach((card) => {
        const move = moves.get(card), leave = leaves.get(card);
        if (move) card.removeEventListener('pointermove', move);
        if (leave) card.removeEventListener('pointerleave', leave);
      });
    };
  }, [active]);
  function navigate(key: WindowKey) {
    const next = windows.findIndex((item) => item.key === key), prev = windows.findIndex((item) => item.key === active);
    setDirection(next >= prev ? 'forward' : 'backward'); setActive(key); setCrystalPulse((pulse) => pulse + 1);
  }
  const runtimeLabel = runtimeState === 'checking' ? 'Checking' : runtimeState === 'ready' ? 'Initialized' : runtimeState === 'unavailable' ? 'Unavailable' : 'API error';
  const language = (id: string) => capabilities?.languages.find((item) => item.id === id);
  const backendLabel = connection === 'connected' ? 'Backend online' : connection === 'checking' ? 'Connecting...' : connection === 'unexpected' ? 'Unexpected response' : 'Backend offline';

  return <div className="pm-page"><div className="pm-window">
    <aside className="pm-rail">
      <div><div className="pm-brand"><div className="pm-mark">*</div><div><b>PolyglotMesh</b><small>GRAALVM RUNTIME STUDIO</small></div></div>
        <div className="pm-nav-label">PROJECT WINDOWS (5)</div><nav className="pm-nav" aria-label="Project windows">
          {windows.map((item, i) => <button key={item.key} className={active === item.key ? 'active' : ''} onClick={() => navigate(item.key)}><span className="pm-nav-icon">{item.icon}</span><span>{i + 1}. {item.title}</span></button>)}
        </nav>
        <section className="pm-rail-status"><div><b>Polyglot Runtime</b><span className={`pm-pill ${runtimeState}`}>{runtimeLabel}</span></div><p>Java host <strong>{capabilities?.hostJavaVersion ?? '--'}</strong></p>{runtimeError && <p className="pm-rail-error">{runtimeError}</p>}{['JavaScript','Python','Ruby'].map((name, i) => {const cap = language(['js','python','ruby'][i]); return <p key={name}>{name}<strong className={cap?.status === 'AVAILABLE' ? 'ok' : ''}>{cap?.status?.replaceAll('_',' ') ?? 'Checking'}</strong></p>})}</section>
      </div>
      <div className="pm-profile"><div className="pm-avatar">VS</div><div><b>Veera Shiva Kumar</b><small>Associate L1 | Java Intern</small></div><footer>INFOTACT SOLUTIONS <strong>ITS/JD/1350</strong></footer></div>
    </aside>
    <main className="pm-main"><header className="pm-header"><div><small>WINDOW 0{windows.findIndex(x => x.key === active) + 1} / 05</small><h1>{windowTitles[windows.findIndex(x => x.key === active)]}</h1></div><div className={`pm-health ${connection}`}><i />{backendLabel}<button onClick={() => {void checkConnection(); void checkRuntime();}} disabled={connection === 'checking'} aria-label="Refresh backend and runtime">R</button></div></header>
      <div key={active} className={`pm-screen pm-slide-${direction}`}>
        {active === 'hub' && <>
          <section className="pm-hero">
            <div className="pm-crystal-area">
              <Suspense fallback={<div className="pm-crystal-loading" role="status" aria-live="polite"><div className="pm-crystal" aria-hidden="true"/><span>Loading polyglot core</span></div>}>
                <CrystalCanvas pulseKey={crystalPulse}/>
              </Suspense>
              <small>TOUCH, DRAG, OR CLICK THE 3D POLYGLOT CORE</small>
            </div>
            <div className="pm-hero-copy">
              <span className="pm-eyebrow">DEVELOPER RUNTIME STUDIO</span>
              <h2>Welcome, Veera!</h2>
              <p>One host. Multiple languages. A single connected workspace.</p>
              <div className="pm-statusline"><span className={connection}>{connection === 'connected' ? '*' : 'o'} {backendLabel}</span><span>{checkedAt ? `Checked ${checkedAt}` : detail}</span></div>
              <div className="pm-hub-actions"><button className="pm-primary" onClick={() => navigate('ide')}>Open Polyglot IDE <b>{'>'}</b></button><button className="pm-secondary" onClick={() => {void checkConnection(); void checkRuntime();}}>Refresh runtime</button></div>
            </div>
          </section>
          <section className="pm-panel pm-capabilities" aria-label="Live runtime capabilities">
            <div className="pm-section-heading"><div><span className="pm-eyebrow">LIVE BACKEND RUNTIME</span><h2>Runtime capabilities</h2></div></div>
            <RuntimeCapabilitiesPanel state={runtimeState} capabilities={capabilities} error={runtimeError}/>
          </section>
          <HubLaunchTiles onNavigate={navigate}/>
          <section className="pm-dispatch pm-tilt-card">
            <div className="pm-dispatch-label"><span className="pm-eyebrow">QUICK COMMAND DISPATCH</span><p>Load a JavaScript snippet into the execution workspace.</p></div>
            <div className="pm-dispatch-row"><input aria-label="Quick command source" value={quickCode} onChange={(event) => setQuickCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setDispatchedCode(quickCode); navigate('ide'); } }}/><button className="pm-primary" onClick={() => { setDispatchedCode(quickCode); navigate('ide'); }}>OPEN IN IDE</button></div>
          </section>
        </>}
        {active === 'ide' && <div className="pm-page-panel pm-tilt-card"><div className="pm-section-heading"><div><span className="pm-eyebrow">JAVA HOST | JAVASCRIPT GUEST</span><h2>Polyglot IDE</h2></div><span className="pm-pill ready">API EXECUTION</span></div><p className="pm-copy">Edit a snippet and run it in the isolated JavaScript worker. Other language tabs from the reference are represented by live capability status in the Runtime Hub.</p><StudioCanvas initialCode={dispatchedCode}/></div>}
        {active === 'security' && <><section className="pm-page-panel pm-tilt-card"><div className="pm-section-heading"><div><span className="pm-eyebrow">EXECUTION BOUNDARIES</span><h2>Sandbox Isolation</h2></div><span className="pm-pill ready">DOCKER DEFAULT</span></div><p className="pm-copy">The production execution provider starts a one-shot Docker worker. The API process's in-process GraalVM context is a separate development option and does not provide an OS isolation boundary.</p><div className="pm-flow"><div><span>01</span><b>Spring API</b><small>Validates request | 20s deadline</small></div><i>{'>'}</i><div><span>02</span><b>Docker worker</b><small>One-shot container | no network</small></div><i>{'>'}</i><div><span>03</span><b>GraalJS context</b><small>Guest code | bounded output</small></div></div><div className="pm-policy-grid">{[['Read-only root filesystem','Configured on Docker worker'],['Non-root user (UID 65534)','Configured on Docker worker'],['Dropped Linux capabilities','Configured on Docker worker'],['No-new-privileges','Configured on Docker worker'],['Memory / CPU / process limits','128 MiB | 0.5 CPU | 32 PIDs'],['Temporary filesystems','16 MiB noexec /tmp; 32 MiB runtime cache'],['Network access','Docker network disabled'],['Timeout handling','20 second worker deadline']].map(([a,b])=><article key={a}><span className="pm-check">OK</span><div><b>{a}</b><small>{b}</small></div></article>)}</div><div className="pm-warning"><b>Two different boundaries</b><p>Docker mode supplies a separate OS process and container controls. <code>EXECUTION_PROVIDER=in-process</code> only restricts a GraalVM Context; it is not equivalent to Docker isolation.</p></div><p className="pm-honest-note">Configuration details are documented in docs/architecture.md.</p></section>
          <section className="pm-page-panel pm-tilt-card"><div className="pm-section-heading"><div><span className="pm-eyebrow">POLICY VIEW</span><h2>Host access controls</h2></div></div><div className="pm-policy-controls">{[['Host filesystem I/O','Disabled in the worker guest context'],['Outbound network sockets','Docker worker network is disabled']].map(([name, status])=><div key={name} className="pm-toggle-row"><span><b>{name}</b><small>{status}</small></span><span className="pm-switch on">LOCKED</span></div>)}</div><p className="pm-honest-note">These are read-only architecture annotations from the current implementation. They do not change runtime security configuration.</p></section></>}
        {active === 'benchmark' && <section className="pm-page-panel pm-tilt-card"><div className="pm-section-heading"><div><span className="pm-eyebrow">MEASUREMENTS</span><h2>Zero-Copy Audit</h2></div><span className="pm-pill unavailable">NOT MEASURED</span></div><div className="pm-audit-art"><div className="pm-data-node">Java<br/><small>host object</small></div><div className="pm-dashed-arrow">-&gt;<small>bridge path not benchmarked</small></div><div className="pm-data-node purple">Guest<br/><small>JavaScript</small></div></div><div className="pm-warning"><b>No benchmark evidence is available</b><p>This project has no benchmark endpoint or measured comparison for zero-copy behavior, serialization cost, latency, or memory. The reference's randomized values are intentionally not shown as results.</p></div><div className="pm-metric-grid">{[['Zero-copy proof','Unavailable'],['Latency comparison','Unmeasured'],['Memory measurements','Unavailable'],['Benchmark dataset','None configured']].map(([a,b])=><article key={a}><small>{a}</small><b>{b}</b></article>)}</div><p className="pm-honest-note">Execution duration in the IDE is the real API response duration, which includes context setup and cleanup; it is not an isolated language benchmark.</p></section>}
        {active === 'database' && <section className="pm-page-panel pm-tilt-card"><div className="pm-section-heading"><div><span className="pm-eyebrow">DATA BINDING</span><h2>MongoDB Integration</h2></div><span className="pm-pill unavailable">NOT IMPLEMENTED</span></div><p className="pm-copy">The current backend has no MongoDB driver, repository, database configuration, or persistence API. This window preserves the reference flow visualization as an architecture concept; it does not claim to connect or run database operations.</p><div className="pm-db-flow"><div><span>01 | SOURCE</span><b>MongoDB</b><small>Connection not configured</small></div><i>{'>'}</i><div><span>02 | HOST</span><b>Java API</b><small>Current service boundary</small></div><i>{'>'}</i><div><span>03 | GUEST</span><b>JavaScript</b><small>Execution API available</small></div></div><div className="pm-warning"><b>Database pipeline unavailable</b><p>No credentials are present in the frontend, and no fake connection or sample success result is displayed. Implementing persistence requires a backend feature and an explicitly configured database.</p></div><div className="pm-saved"><span className="pm-eyebrow">SAVED POLYGLOT SCRIPTS</span><p>Script persistence is not implemented. Execution history is available in the IDE for this browser session only.</p><button className="pm-secondary" onClick={()=>navigate('ide')}>Open IDE</button></div></section>}
      </div>
      <footer className="pm-footer"><span>POLYGLOTMESH <i/> GRAALVM RUNTIME STUDIO</span><span>DAY 10 | MID-REVIEW WORKSPACE <b>*</b></span></footer>
    </main>
  </div></div>;
}


function HubLaunchTiles({ onNavigate }: { onNavigate: (key: WindowKey) => void }) {
  const cards: { key: WindowKey; title: string; description: string; icon: string; tone: string }[] = [
    { key: 'ide', title: 'Polyglot IDE', description: 'Edit and execute JavaScript through the backend API.', icon: '</>', tone: 'indigo' },
    { key: 'security', title: 'Sandbox Isolation', description: 'Inspect the configured Docker execution boundary.', icon: 'S', tone: 'emerald' },
    { key: 'benchmark', title: 'Zero-Copy Audit', description: 'Review what has and has not been measured.', icon: '0', tone: 'orange' },
    { key: 'database', title: 'Database Integration', description: 'Inspect the MongoDB to host to guest flow.', icon: 'DB', tone: 'sky' },
  ];
  return <div className="pm-hub-cards">{cards.map((card) => <button type="button" key={card.key} className={`pm-launch-card pm-tilt-card ${card.tone}`} onClick={() => onNavigate(card.key)}><span className="pm-launch-icon">{card.icon}</span><b>{card.title}</b><small>{card.description}</small><span className="pm-launch-arrow">OPEN WINDOW</span></button>)}</div>;
}
