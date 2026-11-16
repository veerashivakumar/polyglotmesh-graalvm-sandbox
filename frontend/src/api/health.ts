export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 5000;

export class ApiError extends Error {
  constructor(message: string, public readonly kind: 'unavailable' | 'unexpected') {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchHealth(fetcher: typeof fetch = fetch): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetcher(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch {
      throw new ApiError('The backend could not be reached.', 'unavailable');
    }

    if (!response.ok) throw new ApiError(`The backend returned HTTP ${response.status}.`, 'unavailable');

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new ApiError('The backend returned invalid JSON.', 'unexpected');
    }

    if (!isHealthResponse(data)) throw new ApiError('The backend response did not match the health API contract.', 'unexpected');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function isHealthResponse(value: unknown): value is HealthResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  return response.service === 'PolyglotMesh'
    && response.status === 'UP'
    && typeof response.timestamp === 'string'
    && !Number.isNaN(Date.parse(response.timestamp));
}
