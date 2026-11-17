export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
}

export type LanguageStatus = 'AVAILABLE' | 'NOT_INSTALLED' | 'INITIALIZATION_FAILED' | 'NOT_CHECKED';
export type RuntimeStatus = 'INITIALIZED' | 'UNAVAILABLE';

export interface LanguageCapability {
  id: string;
  displayName: string;
  status: LanguageStatus;
  diagnostic: string | null;
}

export interface RuntimeCapabilities {
  runtimeName: string;
  status: RuntimeStatus;
  runtimeVersion: string | null;
  hostJavaVersion: string;
  languages: LanguageCapability[];
  diagnostic: string | null;
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

export async function fetchRuntimeCapabilities(fetcher: typeof fetch = fetch): Promise<RuntimeCapabilities> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetcher(`${API_BASE_URL}/api/runtime/capabilities`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch {
      throw new ApiError('Runtime capabilities could not be reached.', 'unavailable');
    }

    if (!response.ok) throw new ApiError(`The backend returned HTTP ${response.status}.`, 'unavailable');

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new ApiError('The runtime response contained invalid JSON.', 'unexpected');
    }

    if (!isRuntimeCapabilities(data)) {
      throw new ApiError('The runtime response did not match the capabilities API contract.', 'unexpected');
    }
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

function isRuntimeCapabilities(value: unknown): value is RuntimeCapabilities {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  if (typeof response.runtimeName !== 'string'
      || (response.status !== 'INITIALIZED' && response.status !== 'UNAVAILABLE')
      || !(typeof response.runtimeVersion === 'string' || response.runtimeVersion === null)
      || typeof response.hostJavaVersion !== 'string'
      || !(typeof response.diagnostic === 'string' || response.diagnostic === null)
      || !Array.isArray(response.languages)) return false;

  return response.languages.every((language: unknown) => {
    if (!language || typeof language !== 'object') return false;
    const item = language as Record<string, unknown>;
    return typeof item.id === 'string'
      && typeof item.displayName === 'string'
      && (item.status === 'AVAILABLE' || item.status === 'NOT_INSTALLED' || item.status === 'INITIALIZATION_FAILED' || item.status === 'NOT_CHECKED')
      && (typeof item.diagnostic === 'string' || item.diagnostic === null);
  });
}
