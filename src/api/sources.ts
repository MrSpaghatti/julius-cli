import type { JulesAPIClient } from './client.js';
import type { Source, PaginatedResponse } from './types.js';

export class SourcesAPI {
  constructor(private client: JulesAPIClient) {}

  async list(pageSize: number = 30, pageToken?: string): Promise<PaginatedResponse<Source>> {
    const params: any = { pageSize };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await this.client.get<any>('/sources', params);

    return {
      items: response.sources || [],
      nextPageToken: response.nextPageToken,
      totalSize: response.totalSize,
    };
  }

  async get(sourceId: string): Promise<Source> {
    return this.client.get<Source>(`/sources/${sourceId}`);
  }
}
