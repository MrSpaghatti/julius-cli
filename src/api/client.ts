import axios, { type AxiosInstance, type AxiosError } from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import { APIError, AuthError, NetworkError, NotFoundError } from '../utils/errors.js';

export class JulesAPIClient {
  private axios: AxiosInstance;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = 'https://jules.googleapis.com/v1alpha') {
    this.baseURL = baseURL;
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Goog-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add retry logic
    axiosRetry(this.axios, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        // Respect Retry-After header for rate limiting
        const retryAfter = error.response?.headers['retry-after'];
        if (retryAfter) {
          return parseInt(retryAfter) * 1000;
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
        'Invalid or missing API key. Run "jules-cli auth set <key>" to configure.'
      );
    }

    // Not found errors
    if (status === 404) {
      const message = (data as any)?.error?.message || 'Resource not found';
      throw new NotFoundError('Resource', message);
    }

    // API errors
    const errorMessage =
      (data as any)?.error?.message ||
      (data as any)?.message ||
      `API request failed with status ${status}`;

    throw new APIError(errorMessage, status);
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
