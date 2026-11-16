import { describe, expect, it, vi } from 'vitest';
import { ApiError, fetchHealth } from './health';

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
