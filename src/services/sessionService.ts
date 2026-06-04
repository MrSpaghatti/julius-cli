import { SessionsAPI } from '../api/sessions.js';
import type { JulesAPIClient } from '../api/client.js';
import type { Session } from '../api/types.js';
import { getClient } from '../utils/client.js';
import { InvalidArgsError } from '../utils/errors.js';
import { inferRepo } from '../utils/git.js';
import type { OutputFormat } from '../cli/types.js';

export interface CreateSessionParams {
  repo?: string;
  prompt: string;
  title?: string;
  branch?: string;
  autoPr?: boolean;
  requireApproval?: boolean;
  wait?: boolean;
  follow?: boolean;
  format: OutputFormat;
}

export interface CreateSessionResult {
  client: JulesAPIClient;
  session: Session;
  sourceId: string;
}

export async function createSession(
  options: CreateSessionParams
): Promise<CreateSessionResult> {
  const client = await getClient();
  const api = new SessionsAPI(client);

  if (options.prompt.length > 10000) {
    throw new InvalidArgsError('Prompt is too long (max 10,000 characters)');
  }

  let provider = 'github';
  let repo = '';

  if (options.repo) {
    const parts = options.repo.split('/');
    if (parts.length === 3) {
      provider = parts[0];
      repo = `${parts[1]}/${parts[2]}`;
    } else if (parts.length === 2) {
      repo = options.repo;
    } else {
      throw new InvalidArgsError('Repository must be in format: [provider/]owner/repo');
    }
  } else {
    const inferred = inferRepo();
    provider = inferred.provider;
    repo = inferred.repo;
  }

  const sourceId = `${provider}/${repo}`;
  const source = `sources/${sourceId}`;

  const sourceContext: Session['sourceContext'] = { source };
  if (options.branch) {
    if (provider === 'gitlab') {
      sourceContext.gitlabRepoContext = { startingBranch: options.branch };
    } else if (provider === 'bitbucket') {
      sourceContext.bitbucketRepoContext = { startingBranch: options.branch };
    } else {
      sourceContext.githubRepoContext = { startingBranch: options.branch };
    }
  }

  const createParams: Parameters<typeof api.create>[0] = {
    prompt: options.prompt,
    title: options.title,
    sourceContext,
  };
  if (options.autoPr) {
    createParams.automationMode = 'AUTO_CREATE_PR';
  }
  if (options.requireApproval) {
    createParams.requirePlanApproval = true;
  }

  const session = await api.create(createParams);

  return {
    client,
    session,
    sourceId,
  };
}
