import { getToken } from '@clerk/react';
import axios from 'axios';

import { env } from '@/lib/env';

import type { AxiosError, AxiosRequestConfig } from 'axios';

type ApiErrorBody = {
  message: string;
  slug: string;
  details?: ApiErrorDetail[];
};

type ApiErrorDetail = {
  entity_type?: string;
  entity_id?: string;
  error_slug: string;
  message: string;
};

export class ApiError extends Error {
  readonly slug: string;
  readonly status: number;
  readonly details: readonly ApiErrorDetail[];

  constructor(
    message: string,
    opts: { slug: string; status: number; details?: ApiErrorDetail[] },
  ) {
    super(message);
    this.name = 'ApiError';
    this.slug = opts.slug;
    this.status = opts.status;
    this.details = opts.details ?? [];
  }

  get isNetwork() {
    return this.status === 0;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isValidation() {
    return this.status === 400 || this.status === 422;
  }

  get isServerError() {
    return this.status >= 500;
  }

  hasSlug(slug: string) {
    return this.slug === slug;
  }

  /** Details for one entity, handy for mapping errors onto form fields or rows. */
  detailsFor(entityId: string) {
    return this.details.filter((d) => d.entity_id === entityId);
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  // Clerk's standalone getToken waits for Clerk to load, so no React hook is needed.
  const token = await getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

function toApiError(error: AxiosError<Partial<ApiErrorBody>>): ApiError {
  const { response } = error;

  // No HTTP response: network down, CORS, DNS, timeout
  if (!response) {
    const timedOut =
      error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return new ApiError(
      timedOut ? 'Request timed out' : error.message || 'Network error',
      {
        slug: timedOut ? 'timeout' : 'network-error',
        status: 0,
      },
    );
  }

  // Got a response, but the body may not match our error shape
  const body: Partial<ApiErrorBody> =
    typeof response.data === 'object' ? response.data : {};

  return new ApiError(body.message || response.statusText || error.message, {
    slug: body.slug ?? 'unknown-error',
    status: response.status,
    details: body.details,
  });
}

api.interceptors.response.use(
  (response) => response.data,
  (error: unknown) => {
    // Let cancellations through untouched so AbortController and TanStack Query still work
    if (axios.isCancel(error)) return Promise.reject(error);

    // Not an Axios error (e.g. thrown inside a request interceptor)
    if (!axios.isAxiosError<Partial<ApiErrorBody>>(error)) {
      return Promise.reject(error);
    }

    return Promise.reject(toApiError(error));
  },
);

// The response interceptor changes the runtime value, so axios' default
// types no longer apply. Feature code uses `http`, which types the body.
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<T, T>(url, config),
  post: <T, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) => api.post<T, T, TBody>(url, body, config),
  put: <T, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) => api.put<T, T, TBody>(url, body, config),
  patch: <T, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ) => api.patch<T, T, TBody>(url, body, config),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T, T>(url, config),
};
