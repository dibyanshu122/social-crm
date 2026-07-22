import { supabase } from './supabase';

export const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const customUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '');
    if (customUrl) return customUrl;
    // If running on Vercel or non-localhost, fallback to live Render backend
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'https://social-crm.onrender.com';
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
};

export const API_BASE_URL = `${getBackendUrl()}/api/v1`;

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  // Get Supabase Auth Token
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${getBackendUrl()}/api/v1${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}
