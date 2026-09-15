/**
 * Core API Client with automatic JWT Bearer authentication.
 */

export function normalizeApiBase(rawUrl?: string): string {
  if (!rawUrl) return '/api';
  const cleaned = rawUrl.replace(/\/+$/, '');
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
}

const envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
export const API_BASE = normalizeApiBase(envUrl);

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    super(data?.detail || 'API request failed');
    this.status = status;
    this.data = data;
  }
}

import { auth } from '../lib/firebase';

export async function getAuthToken(): Promise<string | null> {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      // ignore and fallback
    }
  }
  return localStorage.getItem('access_token');
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  }

  const timeoutSignal = AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined;
  const signal = options.signal || timeoutSignal;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${cleanEndpoint}`, {
      ...options,
      signal,
      headers,
    });
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new ApiError(408, { detail: 'Network request timed out. Please check your connection and retry.' });
    }
    throw new ApiError(0, { detail: err.message || 'Network request failed.' });
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Clear token on authorization failure
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    throw new ApiError(response.status, data);
  }

  return data as T;
}
