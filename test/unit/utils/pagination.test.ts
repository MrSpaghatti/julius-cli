import { jest } from '@jest/globals';
import { fetchAllPages } from '../../../src/utils/pagination.js';

describe('fetchAllPages', () => {
  it('should fetch all pages when nextPageToken is present', async () => {
    const pages = [
      { items: [1, 2], nextPageToken: 'token1', totalSize: 4 },
      { items: [3, 4], nextPageToken: undefined, totalSize: 4 },
    ];

    let callCount = 0;
    const listFn = jest.fn(async () => {
      const page = pages[callCount];
      callCount++;
      return page;
    });

    const result = await fetchAllPages(listFn as any, 2);

    expect(result.items).toEqual([1, 2, 3, 4]);
    expect(result.totalSize).toBe(4);
    expect(callCount).toBe(2);
    expect(listFn).toHaveBeenNthCalledWith(1, undefined, 2);
    expect(listFn).toHaveBeenNthCalledWith(2, 'token1', 2);
  });

  it('should return empty items if first page is empty', async () => {
    const listFn = jest.fn(async () => ({ items: [], nextPageToken: undefined, totalSize: 0 }));

    const result = await fetchAllPages(listFn as any);

    expect(result.items).toEqual([]);
    expect(result.totalSize).toBe(0);
  });
});
