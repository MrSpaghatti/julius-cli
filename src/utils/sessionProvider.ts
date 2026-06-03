import type {
  SessionProvider,
  SessionSourceContext,
} from '../api/types.js';

const SOURCE_PREFIX = 'sources/';

const PROVIDER_LABELS: Record<SessionProvider, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
};

type SessionRepoContextKey =
  | 'githubRepoContext'
  | 'gitlabRepoContext'
  | 'bitbucketRepoContext';

const PROVIDER_CONTEXT_KEYS: Record<SessionProvider, SessionRepoContextKey> = {
  github: 'githubRepoContext',
  gitlab: 'gitlabRepoContext',
  bitbucket: 'bitbucketRepoContext',
};

export interface NormalizedSessionProviderData {
  provider?: SessionProvider;
  providerLabel?: string;
  sourceId?: string;
  repoSlug?: string;
  startingBranch?: string;
}

export function isSessionProvider(value: string): value is SessionProvider {
  return value === 'github' || value === 'gitlab' || value === 'bitbucket';
}

export function getSessionSourceId(sourceContext: SessionSourceContext): string | undefined {
  if (!sourceContext.source) {
    return undefined;
  }

  return sourceContext.source.startsWith(SOURCE_PREFIX)
    ? sourceContext.source.slice(SOURCE_PREFIX.length)
    : sourceContext.source;
}

export function getSessionProvider(sourceContext: SessionSourceContext): SessionProvider | undefined {
  const sourceId = getSessionSourceId(sourceContext);
  if (!sourceId) {
    return undefined;
  }

  const [provider] = sourceId.split('/');
  return provider && isSessionProvider(provider) ? provider : undefined;
}

export function getSessionRepoSlug(sourceContext: SessionSourceContext): string | undefined {
  const sourceId = getSessionSourceId(sourceContext);
  if (!sourceId) {
    return undefined;
  }

  const [provider, ...repoParts] = sourceId.split('/');
  if (provider && isSessionProvider(provider) && repoParts.length > 0) {
    return repoParts.join('/');
  }

  return sourceId;
}

export function getSessionProviderLabel(sourceContext: SessionSourceContext): string | undefined {
  const provider = getSessionProvider(sourceContext);
  return provider ? PROVIDER_LABELS[provider] : undefined;
}

export function getSessionStartingBranch(sourceContext: SessionSourceContext): string | undefined {
  const provider = getSessionProvider(sourceContext);
  if (provider) {
    return sourceContext[PROVIDER_CONTEXT_KEYS[provider]]?.startingBranch;
  }

  return (
    sourceContext.githubRepoContext?.startingBranch ??
    sourceContext.gitlabRepoContext?.startingBranch ??
    sourceContext.bitbucketRepoContext?.startingBranch
  );
}

export function normalizeSessionProviderData(
  sourceContext: SessionSourceContext
): NormalizedSessionProviderData {
  const provider = getSessionProvider(sourceContext);

  return {
    provider,
    providerLabel: provider ? PROVIDER_LABELS[provider] : undefined,
    sourceId: getSessionSourceId(sourceContext),
    repoSlug: getSessionRepoSlug(sourceContext),
    startingBranch: getSessionStartingBranch(sourceContext),
  };
}

export function createSessionSourceContext(
  provider: SessionProvider,
  repoSlug: string,
  startingBranch?: string
): SessionSourceContext {
  const sourceContext: SessionSourceContext = {
    source: `${SOURCE_PREFIX}${provider}/${repoSlug}`,
  };

  if (startingBranch) {
    sourceContext[PROVIDER_CONTEXT_KEYS[provider]] = { startingBranch };
  }

  return sourceContext;
}
