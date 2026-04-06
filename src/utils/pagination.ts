import type { PaginatedResponse } from '../api/types.js';

/**
 * Automatically fetch all pages for a given list function.
 * @param listFn Function that takes a page token and returns a PaginatedResponse
 * @param pageSize Number of items per page (default: 100 for efficiency)
 */
export async function fetchAllPages<T>(
  listFn: (pageToken?: string, pageSize?: number) => Promise<PaginatedResponse<T>>,
  pageSize: number = 100
): Promise<PaginatedResponse<T>> {
  const allItems: T[] = [];
  let nextPageToken: string | undefined;
  let totalSize: number | undefined;

  do {
    const response = await listFn(nextPageToken, pageSize);
    allItems.push(...response.items);
    nextPageToken = response.nextPageToken;
    totalSize = response.totalSize;
  } while (nextPageToken);

  return {
    items: allItems,
    totalSize: totalSize ?? allItems.length,
  };
}
