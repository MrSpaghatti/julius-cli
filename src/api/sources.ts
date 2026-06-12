import type { JulesAPIClient } from "./client.js";
import type { Source, PaginatedResponse } from "./types.js";

export class SourcesAPI {
	constructor(private client: JulesAPIClient) {}

	async list(
		pageSize: number = 30,
		pageToken?: string,
	): Promise<PaginatedResponse<Source>> {
		const params: Record<string, unknown> = { pageSize };
		if (pageToken) {
			params.pageToken = pageToken;
		}

		interface SourceListResponse {
			sources?: Source[];
			nextPageToken?: string;
			totalSize?: number;
		}

		const response = await this.client.get<SourceListResponse>(
			"/sources",
			params,
		);

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
