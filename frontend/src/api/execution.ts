export interface ExecutionRequest { language: string; code: string }
export interface ExecutionResponse {
  executionId: string;
  language: string;
  status: 'SUCCESS' | 'ERROR';
  output: string;
  error: string | null;
  executionTimeMs: number;
}

export type ExecutionApiErrorKind =
  | 'timeout'
  | 'unavailable'
  | 'unexpected-response'
  | 'runtime-unavailable'
  | 'worker-unavailable'
  | 'worker-failure'
  | 'backend-error'
  | 'request-rejected';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 25_000;

export class ExecutionApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly kind?: ExecutionApiErrorKind) { super(message); this.name = 'ExecutionApiError'; }
}

export async function executeCode(request: ExecutionRequest, fetcher: typeof fetch = fetch): Promise<ExecutionResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetcher(`${API_BASE_URL}/api/executions`, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    throw timedOut
      ? new ExecutionApiError('Execution request exceeded the 25 second client wait limit.', undefined, 'timeout')
      : new ExecutionApiError('The backend could not be reached.', undefined, 'unavailable');
  }
  clearTimeout(timeout);
  let data: unknown;
  try { data = await response.json(); } catch { throw new ExecutionApiError('The backend returned an unexpected response.', response.status, 'unexpected-response'); }
  if (!response.ok) {
    const backendMessage = isRecord(data) && typeof data.message === 'string' ? data.message : '';
    if (response.status === 504) throw new ExecutionApiError('JavaScript execution exceeded the worker time limit.', response.status, 'timeout');
    if (response.status === 503 && backendMessage.toLowerCase().includes('runtime')) {
      throw new ExecutionApiError('The JavaScript runtime is unavailable.', response.status, 'runtime-unavailable');
    }
    if (response.status === 503) {
      throw new ExecutionApiError('The isolated execution worker is unavailable. Ensure Docker is running and the worker image is built.', response.status, 'worker-unavailable');
    }
    if (response.status === 502) {
      throw new ExecutionApiError('The execution worker failed to start or exited unexpectedly.', response.status, 'worker-failure');
    }
    if (response.status >= 500) {
      throw new ExecutionApiError('The backend could not complete the execution request.', response.status, 'backend-error');
    }
    const message = backendMessage || `The backend rejected the execution request (HTTP ${response.status}).`;
    throw new ExecutionApiError(message, response.status, 'request-rejected');
  }
  if (!isExecutionResponse(data)) throw new ExecutionApiError('The execution response did not match the API contract.', response.status, 'unexpected-response');
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object'; }
function isExecutionResponse(value: unknown): value is ExecutionResponse {
  return isRecord(value) && typeof value.executionId === 'string' && value.language === 'javascript'
    && (value.status === 'SUCCESS' || value.status === 'ERROR') && typeof value.output === 'string'
    && (typeof value.error === 'string' || value.error === null) && typeof value.executionTimeMs === 'number';
}
