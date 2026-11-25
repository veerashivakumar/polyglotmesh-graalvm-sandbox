import { useState } from 'react';
import { executeCode, ExecutionApiError, type ExecutionApiErrorKind, type ExecutionResponse } from './api/execution';
import { copyOutputToClipboard, ExecutionConsole, executionStatusLabels, type ExecutionDisplayStatus } from './ExecutionConsole';

const examples = [
  { name: 'Hello PolyglotMesh', code: 'console.log("Hello PolyglotMesh");' },
  { name: 'Simple calculation', code: 'const price = 100;\nconst total = price * 2;\nconsole.log(total);' },
  { name: 'Array processing', code: 'const scores = [82, 91, 76, 95];\nconst average = scores.reduce((sum, score) => sum + score, 0) / scores.length;\nconsole.log({ count: scores.length, average });' },
  { name: 'JSON transformation', code: 'const user = { name: "Ada", roles: ["reviewer", "developer"] };\nconst summary = { ...user, roleCount: user.roles.length };\nconsole.log(JSON.stringify(summary, null, 2));' },
  { name: 'Execution error', code: 'throw new Error("Demo error: inspect the execution status and error details.");' },
];

type StudioStatus = ExecutionDisplayStatus;
type HistoryEntry = { name: string; status: StudioStatus; output: string; error: string; duration?: number; timestamp: string };
const statusByApiErrorKind: Record<ExecutionApiErrorKind, StudioStatus> = {
  timeout: 'timeout',
  unavailable: 'network-error',
  'unexpected-response': 'unexpected-response',
  'runtime-unavailable': 'runtime-unavailable',
  'worker-unavailable': 'docker-unavailable',
  'worker-failure': 'docker-start-failure',
  'backend-error': 'backend-error',
  'request-rejected': 'execution-error',
};

export function StudioCanvas() {
  const [language, setLanguage] = useState('javascript');
  const [selectedExample, setSelectedExample] = useState(examples[1].name);
  const [code, setCode] = useState(examples[1].code);
  const [result, setResult] = useState<ExecutionResponse>();
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<StudioStatus>('idle');
  const [copyMessage, setCopyMessage] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function run() {
    if (running) return;
    if (language !== 'javascript') { setError('Only JavaScript execution is available in the production API.'); setResult(undefined); setStatus('execution-error'); return; }
    setRunning(true); setStatus('running'); setError(''); setResult(undefined); setCopyMessage('');
    let entry: HistoryEntry | undefined;
    try {
      const response = await executeCode({ language, code });
      setResult(response);
      const nextStatus = response.status === 'SUCCESS' ? 'success' : 'execution-error';
      setStatus(nextStatus);
      entry = { name: selectedExample, status: nextStatus, output: response.output, error: response.error ?? '', duration: response.executionTimeMs, timestamp: new Date().toLocaleTimeString() };
    } catch (cause) {
      const message = cause instanceof ExecutionApiError ? cause.message : 'The execution API returned an unexpected error.';
      setError(message);
      const nextStatus = cause instanceof ExecutionApiError ? statusByApiErrorKind[cause.kind ?? 'backend-error'] : 'unexpected-response';
      setStatus(nextStatus);
      entry = { name: selectedExample, status: nextStatus, output: '', error: message, timestamp: new Date().toLocaleTimeString() };
    } finally { setRunning(false); }
    if (entry) setHistory((items) => [entry, ...items].slice(0, 8));
  }

  const loadExample = (name: string) => {
    const example = examples.find((item) => item.name === name);
    if (!example) return;
    setSelectedExample(name); setCode(example.code); setError(''); setResult(undefined); setStatus('idle'); setCopyMessage('');
  };

  async function copyResult() {
    if (!result?.output) return;
    const copied = await copyOutputToClipboard(result.output);
    setCopyMessage(copied ? 'Output copied to clipboard.' : 'Clipboard access failed. Check browser permissions and try again.');
  }

  function clearResult() {
    setResult(undefined);
    setError('');
    setStatus('idle');
    setCopyMessage('');
  }

  return <section className="studio" aria-label="Studio Canvas">
    <div className="studio-heading"><div><span className="eyebrow">02 / STUDIO CANVAS</span><h2>Run a JavaScript snippet</h2></div>
      <div className="studio-selectors"><label className="language-select">EXAMPLE <select aria-label="Code example" value={selectedExample} onChange={(event) => loadExample(event.target.value)}>
        {examples.map((example) => <option key={example.name} value={example.name}>{example.name}</option>)}
      </select></label><label className="language-select">LANGUAGE <select value={language} onChange={(event) => { setLanguage(event.target.value); setError(''); setResult(undefined); setStatus('idle'); }}>
        <option value="javascript">JavaScript</option>
      </select></label></div></div>
    <textarea aria-label="Code editor" spellCheck={false} value={code} onChange={(event) => setCode(event.target.value)} />
    <div className="studio-actions"><span><b className={`studio-state studio-state-${status}`}>{executionStatusLabels[status]}</b> · Java host with JavaScript guest · results come from the execution API</span>
      <button onClick={() => void run()} disabled={running}>{running ? 'RUNNING...' : 'RUN CODE'}</button></div>
    <ExecutionConsole running={running} error={error} result={result} status={status} onCopy={() => void copyResult()} onClear={clearResult} copyMessage={copyMessage} />
    <aside className="execution-history" aria-label="Session execution history"><h3>THIS SESSION <small>Actual executions only · cleared on refresh</small></h3>
      {history.length === 0 ? <p>No executions yet.</p> : <ol>{history.map((item, index) => <li key={`${item.timestamp}-${index}`}><span><strong>{item.name}</strong><small>{item.timestamp} · {executionStatusLabels[item.status]}{item.duration === undefined ? '' : ` · ${item.duration} ms`}</small></span><code>{item.error || item.output || 'No output'}</code></li>)}</ol>}
    </aside>
  </section>;
}
