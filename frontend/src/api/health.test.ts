import { describe, expect, it, vi } from 'vitest';
import { ApiError, fetchHealth, fetchRuntimeCapabilities } from './health';

describe('fetchHealth', () => {
  it('accepts a healthy API response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      service: 'PolyglotMesh', status: 'UP', timestamp: '2026-11-16T12:00:00Z',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(fetchHealth(fetcher)).resolves.toMatchObject({ service: 'PolyglotMesh', status: 'UP' });
    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/\/api\/health$/), expect.objectContaining({ method: 'GET' }));
  });

  it('reports an unavailable backend on HTTP errors', async () => {
    await expect(fetchHealth(async () => new Response(null, { status: 503 })))
      .rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('rejects an unexpected response without reporting success', async () => {
    await expect(fetchHealth(async () => new Response(JSON.stringify({ status: 'UP' }), { status: 200 })))
      .rejects.toBeInstanceOf(ApiError);
    await expect(fetchHealth(async () => new Response(JSON.stringify({ status: 'UP' }), { status: 200 })))
      .rejects.toMatchObject({ kind: 'unexpected' });
  });

  it('reports a network failure as unavailable', async () => {
    await expect(fetchHealth(async () => { throw new TypeError('network'); }))
      .rejects.toMatchObject({ kind: 'unavailable' });
  });
});

describe('fetchRuntimeCapabilities', () => {
  const payload = {
    runtimeName: 'GraalVM Community', status: 'INITIALIZED', runtimeVersion: '24.1.2', hostJavaVersion: '21',
    languages: [
      { id: 'js', displayName: 'JavaScript', status: 'AVAILABLE', diagnostic: null },
      { id: 'python', displayName: 'Python', status: 'NOT_INSTALLED', diagnostic: 'Language is not installed.' },
      { id: 'ruby', displayName: 'Ruby', status: 'NOT_INSTALLED', diagnostic: 'Language is not installed.' },
    ], diagnostic: null,
  };

  it('accepts a structured live capability response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    await expect(fetchRuntimeCapabilities(fetcher)).resolves.toMatchObject({
      status: 'INITIALIZED', languages: expect.arrayContaining([expect.objectContaining({ id: 'js', status: 'AVAILABLE' })]),
    });
    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/\/api\/runtime\/capabilities$/), expect.objectContaining({ method: 'GET' }));
  });

  it('preserves a valid unavailable runtime response', async () => {
    const unavailable = {
      ...payload, status: 'UNAVAILABLE', runtimeVersion: null, diagnostic: 'Runtime initialization failed.',
      languages: payload.languages.map((language) => ({ ...language, status: 'NOT_CHECKED' })),
    };
    await expect(fetchRuntimeCapabilities(async () => new Response(JSON.stringify(unavailable), { status: 200 })))
      .resolves.toMatchObject({ status: 'UNAVAILABLE', runtimeVersion: null });
  });

  it('reports API failures and malformed successful responses distinctly', async () => {
    await expect(fetchRuntimeCapabilities(async () => new Response(null, { status: 503 })))
      .rejects.toMatchObject({ kind: 'unavailable' });
    await expect(fetchRuntimeCapabilities(async () => new Response(JSON.stringify({ status: 'INITIALIZED' }), { status: 200 })))
      .rejects.toMatchObject({ kind: 'unexpected' });
  });
});
