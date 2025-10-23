/**
 * Authentication API
 * User registration, login, and token management
 */

import { fetchAPI, setTokens, clearTokens } from './client';
import { AuthResponse } from './types';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetchAPI<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Store tokens
  setTokens(response.accessToken, response.refreshToken);

  return response;
}

/**
 * Login existing user
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetchAPI<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Store tokens
  setTokens(response.accessToken, response.refreshToken);

  return response;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  // Clear tokens locally
  clearTokens();

  // Optionally call logout endpoint if it exists
  // await fetchAPI('/auth/logout', { method: 'POST' });
}

/**
 * Refresh access token
 */
export async function refreshToken(refreshToken: string): Promise<AuthResponse> {
  const response = await fetchAPI<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  // Update stored tokens
  setTokens(response.accessToken, response.refreshToken);

  return response;
}
