import type { ExecutionResponse } from './api/execution';

export type ExecutionDisplayStatus =
  | 'idle'
  | 'running'
  | 'success'
  | 'execution-error'
  | 'backend-unavailable'
  | 'docker-unavailable'
  | 'docker-start-failure'
  | 'runtime-unavailable'
  | 'timeout'
  | 'network-error'
  | 'unexpected-response'
  | 'backend-error';

export const executionStatusLabels: Record<ExecutionDisplayStatus, string> = {
  idle: 'READY',
  running: 'RUNNING',
  success: 'SUCCESS',
  'execution-error': 'EXECUTION ERROR',
  'backend-unavailable': 'BACKEND UNAVAILABLE',
  'docker-unavailable': 'DOCKER WORKER UNAVAILABLE',
  'docker-start-failure': 'WORKER STARTUP FAILURE',
  'runtime-unavailable': 'RUNTIME UNAVAILABLE',
  timeout: 'TIMEOUT',
  'network-error': 'CONNECTION FAILURE',
  'unexpected-response': 'UNEXPECTED API RESPONSE',
  'backend-error': 'BACKEND ERROR',
};

export async function copyOutputToClipboard(
  output: string,
  clipboard?: Pick<Clipboard, 'writeText'>,
): Promise<boolean> {
  try {
    const target = clipboard ?? (typeof navigator === 'undefined' ? undefined : navigator.clipboard);
    if (!target) return false;
    await target.writeText(output);
    return true;
  } catch {
    return false;
  }
}

export function ExecutionConsole({ running, error, result, status, onCopy, onClear, copyMessage }: {
  running: boolean;
  error: string;
  result?: ExecutionResponse;
  status: ExecutionDisplayStatus;
  onCopy: () => void;
  onClear: () => void;
  copyMessage: string;
}) {
  const hasCurrentResult = Boolean(result || error);
  const displayStatus = result ? (result.status === 'SUCCESS' ? 'success' : 'execution-error') : status;
  return <section className={`execution-console execution-console-${displayStatus}`} aria-live="polite" aria-label="Execution results">
    <div className="console-toolbar">
      <div className="console-heading">
        <span className="console-title">EXECUTION RESULT</span>
        <strong className="console-status" data-status={displayStatus}>{executionStatusLabels[displayStatus]}</strong>
      </div>
      {hasCurrentResult && !running && <div className="result-actions">
        <button type="button" onClick={onCopy} disabled={!result?.output} aria-label="Copy execution output">COPY OUTPUT</button>
        <button type="button" onClick={onClear} aria-label="Clear current result">CLEAR RESULT</button>
      </div>}
    </div>
    {result && <>
      <div className="result-metadata" aria-label="Execution metadata">
        <span>{result.language}</span><span>{result.executionTimeMs} ms</span>
      </div>
      <div className="result-section">
        <h3>OUTPUT</h3>
        <pre aria-label="Execution output">{result.output || '(No output was returned.)'}</pre>
      </div>
      {result.error && <div className="result-error" role="alert"><h3>ERROR DETAILS</h3><pre>{result.error}</pre></div>}
      {result.executionId && <details className="result-details">
        <summary>Execution details</summary>
        <dl><div><dt>Execution ID</dt><dd>{result.executionId}</dd></div></dl>
      </details>}
    </>}
    {!result && error && <div className="result-error" role="alert"><h3>{displayStatus === 'execution-error' ? 'ERROR DETAILS' : 'WHAT HAPPENED'}</h3><p>{error}</p></div>}
    {!running && !result && !error && <p className="console-empty">Run code to inspect the actual execution result.</p>}
    {running && <p className="console-empty">Waiting for the execution API...</p>}
    {copyMessage && <small className="copy-message" role="status">{copyMessage}</small>}
  </section>;
}
