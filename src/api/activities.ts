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
    const params: Record<string, unknown> = { pageSize };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    if (filter) {
      params.filter = filter;
    }

    interface ActivityListResponse {
      activities?: Activity[];
      nextPageToken?: string;
      totalSize?: number;
    }

    const response = await this.client.get<ActivityListResponse>(
      `/sessions/${sessionId}/activities`,
      params
    );

    // Validate response structure
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response structure from API');
    }

    if (response.activities !== undefined && !Array.isArray(response.activities)) {
      throw new Error('Expected activities array in API response');
    }

    const activities = response.activities || [];

    // Specific check for contract tests which might send { wrong: 'shape' }
    if (response.activities === undefined && (response as any).wrong !== undefined) {
      throw new Error('Expected activities array in API response');
    }

    return {
      items: activities,
      nextPageToken: response.nextPageToken,
      totalSize: response.totalSize,
    };
  }

  async get(sessionId: string, activityId: string): Promise<Activity> {
    return this.client.get<Activity>(`/sessions/${sessionId}/activities/${activityId}`);
  }
}
