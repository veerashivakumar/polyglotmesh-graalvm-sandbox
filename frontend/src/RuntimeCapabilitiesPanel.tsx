import type { LanguageCapability, RuntimeCapabilities } from './api/health';

export type CapabilityViewState = 'checking' | 'ready' | 'unavailable' | 'failed';

const languageIds = ['js', 'python', 'ruby'] as const;

export function RuntimeCapabilitiesPanel({ state, capabilities, error }: {
  state: CapabilityViewState;
  capabilities?: RuntimeCapabilities;
  error?: string;
}) {
  const runtimeLabel = {
    checking: 'Checking polyglot runtime',
    ready: 'Polyglot runtime initialized',
    unavailable: 'Polyglot runtime unavailable',
    failed: 'Capability request failed',
  }[state];
  const languageById = new Map(capabilities?.languages.map((language) => [language.id, language]));

  return (
    <>
      <div className={`runtime-status runtime-${state}`} role="status" aria-live="polite">
        <strong>{runtimeLabel}</strong>
        {capabilities && <small>{capabilities.runtimeName} {capabilities.runtimeVersion ?? ''} | Java {capabilities.hostJavaVersion}</small>}
        {(error || capabilities?.diagnostic) && <small>{error || capabilities?.diagnostic}</small>}
      </div>
      <div className="language-grid">
        {languageIds.map((id, index) => <LanguageCard key={id} id={id} number={index + 1} language={languageById.get(id)} loading={state === 'checking'} />)}
      </div>
    </>
  );
}

function LanguageCard({ id, number, language, loading }: {
  id: string;
  number: number;
  language?: LanguageCapability;
  loading: boolean;
}) {
  const labels: Record<string, string> = { js: 'JavaScript', python: 'Python', ruby: 'Ruby' };
  const iconClasses: Record<string, string> = { js: 'js', python: 'py', ruby: 'ruby' };
  const icons: Record<string, string> = { js: 'JS', python: 'Py', ruby: 'Rb' };
  const availability = loading ? 'CHECKING' : !language ? 'NOT REPORTED' : language.status === 'AVAILABLE' ? 'AVAILABLE'
    : language?.status === 'INITIALIZATION_FAILED' ? 'INITIALIZATION FAILED'
      : language?.status === 'NOT_CHECKED' ? 'NOT CHECKED' : 'NOT INSTALLED';

  return (
    <article className="language-card">
      <span className="language-number">0{number}</span><span className={`language-icon ${iconClasses[id]}`}>{icons[id]}</span>
      <h3>{labels[id]}</h3>
      <p>{language?.diagnostic || (language?.status === 'AVAILABLE' ? 'Installed and initialized by the runtime.' : language ? 'Detected from the live runtime.' : 'Not reported by the runtime.')}</p>
      <span className={`availability availability-${language?.status?.toLowerCase() ?? 'checking'}`}><i /> {availability}</span>
    </article>
  );
}
