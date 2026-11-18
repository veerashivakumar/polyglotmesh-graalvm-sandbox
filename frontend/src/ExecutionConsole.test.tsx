import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExecutionConsole } from './ExecutionConsole';

describe('ExecutionConsole', () => {
  it('renders actual successful output and measured duration', () => {
    const html = renderToStaticMarkup(<ExecutionConsole running={false} error="" result={{
      executionId: 'id', language: 'javascript', status: 'SUCCESS', output: '200', error: null, executionTimeMs: 9,
    }} />);
    expect(html).toContain('200');
    expect(html).toContain('SUCCESS | 9 ms');
  });

  it('renders guest errors, request failures, and running state', () => {
    const guestError = renderToStaticMarkup(<ExecutionConsole running={false} error="" result={{
      executionId: 'id', language: 'javascript', status: 'ERROR', output: '', error: 'Syntax error', executionTimeMs: 2,
    }} />);
    expect(guestError).toContain('Syntax error');
    expect(renderToStaticMarkup(<ExecutionConsole running={false} error="The backend could not be reached." />))
      .toContain('The backend could not be reached.');
    expect(renderToStaticMarkup(<ExecutionConsole running error="" />)).toContain('RUNNING');
  });
});
