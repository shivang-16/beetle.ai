"use server";

import { getAuthWithTeam } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";

interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  includeTeamId?: boolean;
}

export const apiRequest = async (
  endpoint: string, 
  options: ApiRequestOptions = {}
): Promise<Response> => {
  const { token, teamId } = await getAuthWithTeam();
  
  const { includeTeamId = true, headers = {}, ...fetchOptions } = options;
  
  const requestHeaders: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add team ID header if available and requested
  if (includeTeamId && teamId) {
    requestHeaders['X-Team-Id'] = teamId;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${_config.API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...fetchOptions,
    headers: requestHeaders,
  });
};

export const apiGet = async (endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
  return apiRequest(endpoint, { ...options, method: 'GET' });
};

export const apiPost = async (endpoint: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => {
  return apiRequest(endpoint, { 
    ...options, 
    method: 'POST', 
    body: body ? JSON.stringify(body) : undefined 
  });
};

export const apiPut = async (endpoint: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => {
  return apiRequest(endpoint, { 
    ...options, 
    method: 'PUT', 
    body: body ? JSON.stringify(body) : undefined 
  });
};

export const apiDelete = async (endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};