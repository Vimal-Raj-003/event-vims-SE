import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.vims.events/v1";

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
}

function clearStoredTokens(): void {
  localStorage.removeItem("vims:tokens");
  localStorage.removeItem("vims:user");
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
          window.location.href = "/auth/organiser/login";
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{ data: TokenPayload }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: tokens.refreshToken },
        );

        setStoredTokens(data.data);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        clearStoredTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/organiser/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export { getStoredTokens, setStoredTokens, clearStoredTokens };
