import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchHealth, fetchRuntimeCapabilities, type RuntimeCapabilities } from './api/health';
import { RuntimeCapabilitiesPanel, type CapabilityViewState } from './RuntimeCapabilitiesPanel';
import { StudioCanvas } from './StudioCanvas';

type Connection = 'checking' | 'connected' | 'unavailable' | 'unexpected';

export default function App() {
  const [connection, setConnection] = useState<Connection>('checking');
  const [checkedAt, setCheckedAt] = useState<string>();
  const [detail, setDetail] = useState('');
  const [runtimeState, setRuntimeState] = useState<CapabilityViewState>('checking');
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities>();
  const [runtimeError, setRuntimeError] = useState('');

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

  useEffect(() => {
    void fetchRuntimeCapabilities().then((result) => {
      setCapabilities(result);
      setRuntimeState(result.status === 'INITIALIZED' ? 'ready' : 'unavailable');
    }).catch((error: unknown) => {
      setRuntimeState('failed');
      setRuntimeError(error instanceof ApiError ? error.message : 'An unexpected error occurred while checking runtime capabilities.');
    });
  }, []);

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
        <RuntimeCapabilitiesPanel state={runtimeState} capabilities={capabilities} error={runtimeError} />
        <p className="roadmap-note">Runtime statuses report capability detection. JavaScript is available in Studio Canvas below.</p>
      </section>
      <StudioCanvas />
      <footer><span>POLYGLOTMESH <i /> GRAALVM RUNTIME SANDBOX</span><span>BUILT FOR EXPLORATION <b>✳</b></span></footer>
    </main>
  );
}
