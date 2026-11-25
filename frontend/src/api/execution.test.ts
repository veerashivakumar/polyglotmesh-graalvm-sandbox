import { describe, expect, it, vi } from 'vitest';
import { executeCode } from './execution';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const success = { executionId: 'real-id', language: 'javascript', status: 'SUCCESS', output: '200', error: null, executionTimeMs: 7 };

describe('executeCode', () => {
  it('posts the selected JavaScript source and returns actual response data', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(success));
    await expect(executeCode({ language: 'javascript', code: 'console.log(100 * 2)' }, fetcher)).resolves.toEqual(success);
    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/\/api\/executions$/), expect.objectContaining({
      method: 'POST', body: JSON.stringify({ language: 'javascript', code: 'console.log(100 * 2)' }),
    }));
  });

  it('surfaces backend errors, unsupported languages, and network failures', async () => {
    await expect(executeCode({ language: 'python', code: 'print(1)' }, vi.fn().mockResolvedValue(response({ message: 'Only JavaScript execution is supported.' }, 400))))
      .rejects.toMatchObject({ message: 'Only JavaScript execution is supported.', status: 400, kind: 'request-rejected' });
    await expect(executeCode({ language: 'javascript', code: 'x' }, vi.fn().mockRejectedValue(new Error('offline'))))
      .rejects.toMatchObject({ name: 'ExecutionApiError', kind: 'unavailable', message: 'The backend could not be reached.' });
  });

  it('maps actual timeout and worker/runtime failures without exposing arbitrary 5xx details', async () => {
    await expect(executeCode({ language: 'javascript', code: 'while(true){}' }, vi.fn().mockResolvedValue(response({ message: 'JavaScript execution exceeded the worker time limit.' }, 504))))
      .rejects.toMatchObject({ kind: 'timeout', message: 'JavaScript execution exceeded the worker time limit.' });
    await expect(executeCode({ language: 'javascript', code: 'x' }, vi.fn().mockResolvedValue(response({ message: 'JavaScript runtime is unavailable.' }, 503))))
      .rejects.toMatchObject({ kind: 'runtime-unavailable', message: 'The JavaScript runtime is unavailable.' });
    await expect(executeCode({ language: 'javascript', code: 'x' }, vi.fn().mockResolvedValue(response({ message: 'worker failure' }, 502))))
      .rejects.toMatchObject({ kind: 'worker-failure', message: 'The execution worker failed to start or exited unexpectedly.' });
    await expect(executeCode({ language: 'javascript', code: 'x' }, vi.fn().mockResolvedValue(response({ message: 'private server detail' }, 500))))
      .rejects.toMatchObject({ kind: 'backend-error', message: 'The backend could not complete the execution request.' });
  });

  it('identifies malformed JSON and unexpected successful response shapes', async () => {
    await expect(executeCode({ language: 'javascript', code: 'x' }, vi.fn().mockResolvedValue(response({}))))
      .rejects.toMatchObject({ kind: 'unexpected-response' });
    const invalidJson = response({});
    invalidJson.json = async () => { throw new Error('invalid'); };
    await expect(executeCode({ language: 'javascript', code: 'x' }, vi.fn().mockResolvedValue(invalidJson)))
      .rejects.toMatchObject({ kind: 'unexpected-response' });
  });
});
