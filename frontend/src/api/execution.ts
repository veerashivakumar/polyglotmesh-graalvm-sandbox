export interface ExecutionRequest { language: string; code: string }
export interface ExecutionResponse {
  executionId: string;
  language: string;
  status: 'SUCCESS' | 'ERROR';
  output: string;
  error: string | null;
  executionTimeMs: number;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 10_000;

export class ExecutionApiError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); this.name = 'ExecutionApiError'; }
}

export async function executeCode(request: ExecutionRequest, fetcher: typeof fetch = fetch): Promise<ExecutionResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetcher(`${API_BASE_URL}/api/executions`, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    throw new ExecutionApiError('The backend could not be reached.');
  }
  clearTimeout(timeout);
  let data: unknown;
  try { data = await response.json(); } catch { throw new ExecutionApiError('The backend returned invalid JSON.', response.status); }
  if (!response.ok) {
    const message = isRecord(data) && typeof data.message === 'string' ? data.message : `The backend returned HTTP ${response.status}.`;
    throw new ExecutionApiError(message, response.status);
  }
  if (!isExecutionResponse(data)) throw new ExecutionApiError('The execution response did not match the API contract.', response.status);
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object'; }
function isExecutionResponse(value: unknown): value is ExecutionResponse {
  return isRecord(value) && typeof value.executionId === 'string' && value.language === 'javascript'
    && (value.status === 'SUCCESS' || value.status === 'ERROR') && typeof value.output === 'string'
    && (typeof value.error === 'string' || value.error === null) && typeof value.executionTimeMs === 'number';
}
