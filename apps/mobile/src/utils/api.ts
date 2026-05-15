import axios from 'axios';
import { getInferredBaseUrl } from '@fresherflow/api-client';
import { IdentityManager } from './identity';

/**
 * Premium Axios Instance
 * 
 * Features:
 * 1. Automatic Base URL resolution
 * 2. 10s Timeout for better mobile UX
 * 3. Global Interceptors for error handling
 */
const api = axios.create({
  baseURL: getInferredBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor (Add Auth Tokens here later)
api.interceptors.request.use(
  async (config) => {
    // Add Anonymous Identity Header
    const anonId = await IdentityManager.getAnonId();
    if (anonId) {
      config.headers['x-fresherflow-anon-id'] = anonId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor (Global Error Handling)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    
    // We can trigger global toasts here if needed
    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message,
    });

    return Promise.reject(new Error(message));
  }
);

export default api;
