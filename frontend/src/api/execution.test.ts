import { describe, expect, it, vi } from 'vitest';
import { executeCode, ExecutionApiError } from './execution';

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
      .rejects.toMatchObject({ message: 'Only JavaScript execution is supported.', status: 400 });
    await expect(executeCode({ language: 'javascript', code: 'x' }, vi.fn().mockRejectedValue(new Error('offline'))))
      .rejects.toBeInstanceOf(ExecutionApiError);
  });
});
