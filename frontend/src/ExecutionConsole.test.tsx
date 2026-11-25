import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { copyOutputToClipboard, ExecutionConsole } from './ExecutionConsole';

const successfulResult = {
  executionId: 'id',
  language: 'javascript',
  status: 'SUCCESS' as const,
  output: '200',
  error: null,
  executionTimeMs: 9,
};

const renderConsole = (overrides: Partial<Parameters<typeof ExecutionConsole>[0]> = {}) => renderToStaticMarkup(
  <ExecutionConsole running={false} error="" result={successfulResult} status="success" onCopy={() => {}} onClear={() => {}} copyMessage="" {...overrides} />,
);

describe('ExecutionConsole', () => {
  it('renders successful output, actual metadata, and a details section', () => {
    const html = renderConsole();
    expect(html).toContain('200');
    expect(html).toContain('SUCCESS');
    expect(html).toContain('javascript');
    expect(html).toContain('9 ms');
    expect(html).toContain('Execution details');
    expect(html).toContain('id');
  });

  it('renders guest errors separately from captured output', () => {
    const guestError = renderConsole({ result: { ...successfulResult, status: 'ERROR', output: 'partial output', error: 'Syntax error' }, status: 'execution-error' });
    expect(guestError).toContain('Syntax error');
    expect(guestError).toContain('partial output');
    expect(guestError).toContain('ERROR DETAILS');
  });

  it('renders no-output text and avoids inventing unavailable execution details', () => {
    const noOutput = renderConsole({ result: { ...successfulResult, executionId: '', output: '' } });
    expect(noOutput).toContain('(No output was returned.)');
    expect(noOutput).not.toContain('Execution details');
    const unavailable = renderConsole({ result: undefined, error: 'The JavaScript runtime is unavailable.', status: 'runtime-unavailable' });
    expect(unavailable).toContain('RUNTIME UNAVAILABLE');
    expect(unavailable).not.toContain('Execution details');
  });

  it('renders long output in a preformatted output region and request failure states', () => {
    const output = 'line one\n'.repeat(2_000);
    expect(renderConsole({ result: { ...successfulResult, output } })).toContain(output);
    expect(renderConsole({ result: undefined, error: 'The backend could not be reached.', status: 'network-error' }))
      .toContain('The backend could not be reached.');
    expect(renderConsole({ running: true, result: undefined, status: 'running' })).toContain('Waiting for the execution API');
  });

  it('invokes the clear action callback', () => {
    let cleared = false;
    const element = ExecutionConsole({
      running: false, error: '', result: successfulResult, status: 'success',
      onCopy: () => {}, onClear: () => { cleared = true; }, copyMessage: '',
    });
    const toolbar = element.props.children[0];
    const actions = toolbar.props.children[1];
    const clearButton = actions.props.children[1];
    clearButton.props.onClick();
    expect(cleared).toBe(true);
  });

  it('copies output and handles clipboard failures', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyOutputToClipboard('actual output', { writeText })).toBe(true);
    expect(writeText).toHaveBeenCalledWith('actual output');
    expect(await copyOutputToClipboard('actual output', { writeText: vi.fn().mockRejectedValue(new Error('denied')) })).toBe(false);
    expect(await copyOutputToClipboard('actual output', undefined)).toBe(false);
  });
});
