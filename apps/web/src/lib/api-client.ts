import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

function getStoredTokens(): TokenPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("vims:tokens");
    return raw ? (JSON.parse(raw) as TokenPayload) : null;
  } catch {
    return null;
  }
}

function setStoredTokens(tokens: TokenPayload): void {
  localStorage.setItem("vims:tokens", JSON.stringify(tokens));
  // Sync tokens to auth store's localStorage key so Zustand persist stays in sync
  try {
    const authRaw = localStorage.getItem("vims:auth");
    if (authRaw) {
      const authState = JSON.parse(authRaw);
      authState.state = {
        ...authState.state,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
      localStorage.setItem("vims:auth", JSON.stringify(authState));
    }
  } catch {
    // Non-critical — auth store will re-sync on next login
  }
}

function clearStoredTokens(): void {
  localStorage.removeItem("vims:tokens");
  localStorage.removeItem("vims:user");
  localStorage.removeItem("vims:auth");
}

function getLoginPathForCurrentRole(): string {
  try {
    const authRaw = localStorage.getItem("vims:auth");
    if (authRaw) {
      const authState = JSON.parse(authRaw);
      const role = authState?.state?.user?.role;
      if (role === "super-admin") return "/auth/super-admin/login";
      if (role === "attendee") return "/auth/attendee/login";
    }
  } catch {
    // Fall through to default
  }
  return "/auth/organiser/login";
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = getStoredTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Single in-flight refresh promise — prevents concurrent 401s from each
// spawning their own refresh call (which would consume and revoke each other's
// refresh tokens via rotation).
let refreshPromise: Promise<TokenPayload> | null = null;

function refreshTokens(refreshToken: string): Promise<TokenPayload> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = axios
    .post<{ data: TokenPayload }>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    .then((res) => {
      setStoredTokens(res.data.data);
      return res.data.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const tokens = getStoredTokens();
      if (!tokens?.refreshToken) {
        clearStoredTokens();
        if (typeof window !== "undefined") {
          window.location.href = getLoginPathForCurrentRole();
        }
        return Promise.reject(error);
      }

      try {
        const fresh = await refreshTokens(tokens.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${fresh.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        clearStoredTokens();
        if (typeof window !== "undefined") {
          window.location.href = getLoginPathForCurrentRole();
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export { getStoredTokens, setStoredTokens, clearStoredTokens };
