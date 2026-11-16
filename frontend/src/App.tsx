import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchHealth } from './api/health';

type Connection = 'checking' | 'connected' | 'unavailable' | 'unexpected';

export default function App() {
  const [connection, setConnection] = useState<Connection>('checking');
  const [checkedAt, setCheckedAt] = useState<string>();
  const [detail, setDetail] = useState('');

  const checkConnection = useCallback(async () => {
    setConnection('checking');
    setDetail('');
    try {
      await fetchHealth();
      setConnection('connected');
    } catch (error) {
      if (error instanceof ApiError) {
        setConnection(error.kind);
        setDetail(error.message);
      } else {
        setConnection('unexpected');
        setDetail('An unexpected error occurred while checking the backend.');
      }
    } finally {
      setCheckedAt(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => { void checkConnection(); }, [checkConnection]);

  const state = {
    checking: { label: 'Checking connection', symbol: '···', description: 'Contacting the PolyglotMesh API' },
    connected: { label: 'Backend connected', symbol: '●', description: 'Health endpoint responded successfully' },
    unavailable: { label: 'Backend unavailable', symbol: '!', description: detail || 'Start the backend and try again.' },
    unexpected: { label: 'Unexpected API response', symbol: '?', description: detail || 'The response did not match the expected contract.' },
  }[connection];

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="PolyglotMesh home"><span className="brand-mark">P</span><span>polyglot<span className="brand-light">mesh</span></span></a>
        <span className="edition">RUNTIME SANDBOX <i /> DAY 02</span>
      </header>
      <section className="hero" id="home">
        <div className="eyebrow"><span /> DEVELOPER ENVIRONMENT</div>
        <h1>One workspace.<br /><em>Many languages.</em></h1>
        <p className="intro">A focused environment for exploring polyglot runtimes, one execution at a time.</p>
        <div className={`connection connection-${connection}`} role="status" aria-live="polite">
          <span className="connection-symbol">{state.symbol}</span>
          <span className="connection-copy"><strong>{state.label}</strong><small>{state.description}</small></span>
          <button onClick={() => void checkConnection()} disabled={connection === 'checking'}>RETRY <span aria-hidden="true">↗</span></button>
        </div>
        {checkedAt && <p className="checked-at">LAST CHECKED {checkedAt}</p>}
      </section>
      <section className="workspace" aria-label="Runtime overview">
        <div className="workspace-heading"><div><span className="eyebrow">01 / GETTING STARTED</span><h2>Your runtime workspace</h2></div><span className="workspace-index">PM — 001</span></div>
        <div className="language-grid">
          <article className="language-card"><span className="language-number">01</span><span className="language-icon js">JS</span><h3>JavaScript</h3><p>Fast iteration in a familiar runtime.</p><span className="availability"><i /> READY TO CONNECT</span></article>
          <article className="language-card"><span className="language-number">02</span><span className="language-icon py">Py</span><h3>Python</h3><p>Bring expressive scripting to the mix.</p><span className="availability"><i /> READY TO CONNECT</span></article>
          <article className="language-card"><span className="language-number">03</span><span className="language-icon java">J</span><h3>Java</h3><p>Build on the strength of the JVM.</p><span className="availability"><i /> READY TO CONNECT</span></article>
        </div>
        <p className="roadmap-note"><span>↗</span> Language execution is on the roadmap. The backend status above reflects the live health API.</p>
      </section>
      <footer><span>POLYGLOTMESH <i /> GRAALVM RUNTIME SANDBOX</span><span>BUILT FOR EXPLORATION <b>✳</b></span></footer>
    </main>
  );
}
