import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RuntimeCapabilitiesPanel } from './RuntimeCapabilitiesPanel';

const capabilities = {
  runtimeName: 'GraalVM Community', status: 'INITIALIZED' as const, runtimeVersion: '24.1.2', hostJavaVersion: '21',
  languages: [
    { id: 'js', displayName: 'JavaScript', status: 'AVAILABLE' as const, diagnostic: null },
    { id: 'python', displayName: 'Python', status: 'NOT_INSTALLED' as const, diagnostic: 'Language is not installed.' },
    { id: 'ruby', displayName: 'Ruby', status: 'NOT_INSTALLED' as const, diagnostic: 'Language is not installed.' },
  ], diagnostic: null,
};

describe('RuntimeCapabilitiesPanel', () => {
  it('renders runtime and per-language states from the API response', () => {
    const html = renderToStaticMarkup(<RuntimeCapabilitiesPanel state="ready" capabilities={capabilities} />);
    expect(html).toContain('Polyglot runtime initialized');
    expect(html).toContain('AVAILABLE');
    expect(html).toContain('NOT INSTALLED');
  });

  it('shows runtime unavailable and capability request failure honestly', () => {
    const unavailable = renderToStaticMarkup(<RuntimeCapabilitiesPanel state="unavailable" capabilities={{
      ...capabilities, status: 'UNAVAILABLE', languages: capabilities.languages.map((language) => ({ ...language, status: 'NOT_CHECKED' })),
    }} />);
    expect(unavailable).toContain('Polyglot runtime unavailable');
    expect(unavailable).toContain('NOT CHECKED');
    const failed = renderToStaticMarkup(<RuntimeCapabilitiesPanel state="failed" error="Backend could not be reached." />);
    expect(failed).toContain('Capability request failed');
    expect(failed).toContain('Backend could not be reached.');
  });
});
