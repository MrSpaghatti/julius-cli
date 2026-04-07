import type { JulesAPIClient } from './client.js';
import type { Activity, PaginatedResponse } from './types.js';

export class ActivitiesAPI {
  constructor(private client: JulesAPIClient) {}

  async list(
    sessionId: string,
    pageSize: number = 30,
    pageToken?: string,
    filter?: string
  ): Promise<PaginatedResponse<Activity>> {
    const params: any = { pageSize };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    if (filter) {
      params.filter = filter;
    }

    const response = await this.client.get<any>(
      `/sessions/${sessionId}/activities`,
      params
    );

    return {
      items: response.activities || [],
      nextPageToken: response.nextPageToken,
      totalSize: response.totalSize,
    };
  }

  async get(sessionId: string, activityId: string): Promise<Activity> {
    return this.client.get<Activity>(`/sessions/${sessionId}/activities/${activityId}`);
  }
}
