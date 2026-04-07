import axios, { type AxiosInstance, type AxiosError } from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import { APIError, AuthError, NetworkError, NotFoundError } from '../utils/errors.js';
import { TokenProvider } from '../utils/token-provider.js';

export class JulesAPIClient {
  private axios: AxiosInstance;
  private baseURL: string;

  constructor(
    private tokenProvider: TokenProvider,
    baseURL: string = process.env.JULES_API_URL || process.env.JULES_API_ENDPOINT || 'https://jules.googleapis.com/v1alpha'
  ) {
    this.baseURL = baseURL;
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add auth header interceptor
    this.axios.interceptors.request.use(async (config) => {
      const headers = await this.tokenProvider.getAuthHeader();
      Object.assign(config.headers, headers);
      return config;
    });

    // Add retry logic
    axiosRetry(this.axios, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        // Respect Retry-After header for rate limiting
        const retryAfter = error.response?.headers['retry-after'];
        if (retryAfter) {
          const parsedInt = parseInt(retryAfter, 10);
          if (!isNaN(parsedInt) && String(parsedInt) === retryAfter) {
            return parsedInt * 1000;
          }
          const parsedDate = new Date(retryAfter).getTime();
          if (!isNaN(parsedDate)) {
            const delay = parsedDate - Date.now();
            return delay > 0 ? delay : exponentialDelay(retryCount);
          }
        }
        return exponentialDelay(retryCount);
      },
      retryCondition: (error) => {
        // Retry on network errors or 5xx errors or 429 (rate limit)
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429 ||
          (error.response?.status ?? 0) >= 500
        );
      },
    });
  }

  private handleError(error: unknown): never {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const axiosError = error as AxiosError;

    // Network errors
    if (!axiosError.response) {
      throw new NetworkError(
        axiosError.message || 'Network error occurred'
      );
    }

    const { status, data } = axiosError.response;

    // Authentication errors
    if (status === 401 || status === 403) {
      throw new AuthError(
        'Invalid or missing credentials. Run "julius-cli auth login" or "julius-cli auth set <key>" to configure.'
      );
    }

    // Extract error message from response with proper type safety
    const errorMessage = this.extractErrorMessage(data, status);

    // Not found errors
    if (status === 404) {
      const url = axiosError.config?.url || '';
      const parts = url.split('/').filter(Boolean);
      if (parts.length >= 1) {
        const id = parts[parts.length - 1];
        let resource = 'Resource';
        if (parts.length >= 2) {
          const rawResource = parts[parts.length - 2];
          // Simple normalization: sessions -> Session
          resource = rawResource.charAt(0).toUpperCase() + rawResource.slice(1).replace(/s$/, '');
        }
        throw new NotFoundError(resource, id);
      }
      throw new NotFoundError('Resource', errorMessage);
    }

    // API errors
    throw new APIError(errorMessage, status);
  }

  private extractErrorMessage(data: unknown, status: number): string {
    // Validate data is an object before accessing properties
    if (typeof data !== 'object' || data === null) {
      return `API request failed with status ${status}`;
    }

    const obj = data as Record<string, unknown>;

    // Try nested error object
    if (typeof obj.error === 'object' && obj.error !== null) {
      const errorObj = obj.error as Record<string, unknown>;
      if (typeof errorObj.message === 'string') {
        return errorObj.message;
      }
    }

    // Try top-level message
    if (typeof obj.message === 'string') {
      return obj.message;
    }

    // Fallback
    return `API request failed with status ${status}`;
  }

  async get<T>(path: string, params?: any): Promise<T> {
    try {
      const response = await this.axios.get<T>(path, { params });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post<T>(path: string, data?: any): Promise<T> {
    try {
      const response = await this.axios.post<T>(path, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put<T>(path: string, data?: any): Promise<T> {
    try {
      const response = await this.axios.put<T>(path, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      const response = await this.axios.delete<T>(path);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
}
