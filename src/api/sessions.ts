import type { JulesAPIClient } from './client.js';
import type {
  Session,
  PaginatedResponse,
  AutomationMode,
  WebhookConfig,
} from './types.js';

export interface CreateSessionParams {
  prompt: string;
  sourceContext: {
    source: string;
    githubRepoContext?: {
      startingBranch: string;
    };
  };
  automationMode?: AutomationMode;
  requirePlanApproval?: boolean;
  title?: string;
}

export class SessionsAPI {
  constructor(private client: JulesAPIClient) {}

  async create(params: CreateSessionParams): Promise<Session> {
    return this.client.post<Session>('/sessions', params);
  }

  async list(
    pageSize: number = 30,
    pageToken?: string,
    filter?: string
  ): Promise<PaginatedResponse<Session>> {
    const params: Record<string, unknown> = { pageSize };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    if (filter) {
      params.filter = filter;
    }

    interface SessionListResponse {
      sessions?: Session[];
      nextPageToken?: string;
      totalSize?: number;
    }

    const response = await this.client.get<SessionListResponse>('/sessions', params);

    // Validate response structure
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response structure from API');
    }

    const sessions = response.sessions || [];

    return {
      items: sessions,
      nextPageToken: response.nextPageToken,
      totalSize: response.totalSize,
    };
  }

  async get(sessionId: string): Promise<Session> {
    return this.client.get<Session>(`/sessions/${sessionId}`);
  }

  async sendMessage(sessionId: string, prompt: string): Promise<void> {
    await this.client.post(`/sessions/${sessionId}:sendMessage`, { prompt });
  }

  async approvePlan(sessionId: string): Promise<void> {
    await this.client.post(`/sessions/${sessionId}:approvePlan`, {});
  }

  async cancel(sessionId: string): Promise<void> {
    await this.client.post(`/sessions/${sessionId}:cancel`, {});
  }

  async registerWebhook(
    sessionId: string,
    config: WebhookConfig
  ): Promise<void> {
    await this.client.post(`/sessions/${sessionId}:registerWebhook`, config);
  }
}
