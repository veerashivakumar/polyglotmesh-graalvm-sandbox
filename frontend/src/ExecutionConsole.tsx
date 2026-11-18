import type { ExecutionResponse } from './api/execution';

export function ExecutionConsole({ running, error, result }: {
  running: boolean;
  error: string;
  result?: ExecutionResponse;
}) {
  return <div className="execution-console" aria-live="polite" aria-label="Execution console">
    <div className="console-title">CONSOLE{running && <span> RUNNING</span>}</div>
    {error && <p className="console-error" role="alert">{error}</p>}
    {result && <><pre>{result.output || (result.status === 'SUCCESS' ? '(no output)' : '')}</pre>{result.error && <p className="console-error" role="alert">{result.error}</p>}
      <small>{result.status} | {result.executionTimeMs} ms</small></>}
    {!running && !result && !error && <small>Run code to see its output.</small>}
  </div>;
}
