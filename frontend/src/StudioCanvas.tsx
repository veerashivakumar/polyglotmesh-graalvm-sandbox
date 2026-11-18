import { useState } from 'react';
import { executeCode, ExecutionApiError, type ExecutionResponse } from './api/execution';
import { ExecutionConsole } from './ExecutionConsole';

const initialCode = 'const price = 100;\nconsole.log(price * 2);';

export function StudioCanvas() {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<ExecutionResponse>();
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  async function run() {
    if (running) return;
    if (language !== 'javascript') { setError(`${language === 'python' ? 'Python' : 'Ruby'} execution is not available yet.`); setResult(undefined); return; }
    setRunning(true); setError(''); setResult(undefined);
    try { setResult(await executeCode({ language, code })); }
    catch (cause) { setError(cause instanceof ExecutionApiError ? cause.message : 'Execution failed because of an unexpected error.'); }
    finally { setRunning(false); }
  }

  return <section className="studio" aria-label="Studio Canvas">
    <div className="studio-heading"><div><span className="eyebrow">02 / STUDIO CANVAS</span><h2>Run a JavaScript snippet</h2></div>
      <label className="language-select">LANGUAGE <select value={language} onChange={(event) => { setLanguage(event.target.value); setError(''); setResult(undefined); }}>
        <option value="javascript">JavaScript</option><option value="python">Python</option><option value="ruby">Ruby</option>
      </select></label></div>
    <textarea aria-label="Code editor" spellCheck={false} value={code} onChange={(event) => setCode(event.target.value)} />
    <div className="studio-actions"><span>{language === 'javascript' ? 'JavaScript execution available' : `${language === 'python' ? 'Python' : 'Ruby'} execution not available yet`}</span>
      <button onClick={() => void run()} disabled={running || language !== 'javascript'}>{running ? 'RUNNING...' : 'RUN CODE'}</button></div>
    <ExecutionConsole running={running} error={error} result={result} />
  </section>;
}
