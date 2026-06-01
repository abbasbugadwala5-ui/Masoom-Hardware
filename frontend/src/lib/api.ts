import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,    // send refresh cookie
});

let accessToken: string | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

export const getAccessToken = () => accessToken;

api.interceptors.request.use((cfg) => {
  if (accessToken) {
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  return cfg;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const r = await axios.post<{ data: { accessToken: string } }>(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    accessToken = r.data.data.accessToken;
    return accessToken;
  } catch {
    accessToken = null;
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const newToken = await refreshing;
      if (newToken) {
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${newToken}` };
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);
