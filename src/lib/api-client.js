import axios from "axios";

/**
 * Axios instance for the ERP API. Requests go to the same origin (/api/v1) and are forwarded
 * to the backend by the Next.js rewrite, so auth cookies stay first-party.
 *
 * - The access token lives in memory only (never localStorage) and is sent as a bearer token.
 * - On a 401 the client refreshes once (shared by concurrent requests) and retries; if the refresh
 *   fails, the registered auth-failure handler signs the user out.
 */
const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  timeout: 30_000,
});

/** Error shape every caller can rely on: { status, message, errors: [{ path, message }] }. */
export class ApiError extends Error {
  constructor({ status, message, errors = [] }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

const toApiError = (error) => {
  if (error instanceof ApiError) return error;
  const body = error.response?.data;
  return new ApiError({
    status: error.response?.status ?? 0,
    message: body?.message ?? (error.response ? error.message : "Cannot reach the server"),
    errors: body?.errors ?? [],
  });
};

// --- access token + refresh -----------------------------------------------------------------

let accessToken = null;
let refreshing = null;
let onAuthFailure = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};

export const setAuthFailureHandler = (handler) => {
  onAuthFailure = handler;
};

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshAccessToken() {
  refreshing ??= axios
    .post("/api/v1/auth/refresh", null, { withCredentials: true })
    .then((res) => {
      setAccessToken(res.data.data.accessToken);
      return res.data.data.accessToken;
    })
    .catch((error) => {
      setAccessToken(null);
      throw toApiError(error);
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// Endpoints where a 401 means "wrong credentials", not "token expired"
const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/reset-password"];

api.interceptors.request.use((request) => {
  if (accessToken) request.headers.Authorization = `Bearer ${accessToken}`;
  return request;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const shouldRefresh =
      error.response?.status === 401 &&
      request &&
      !request._retried &&
      !NO_REFRESH.some((path) => request.url?.startsWith(path));

    if (!shouldRefresh) throw toApiError(error);

    request._retried = true;
    try {
      await refreshAccessToken();
    } catch (refreshError) {
      onAuthFailure();
      throw refreshError;
    }
    return api(request);
  },
);

/** Unwraps the backend envelope `{ success, message, data, meta }` → `{ data, meta, message }`. */
const unwrap = (response) => ({
  data: response.data.data,
  meta: response.data.meta,
  message: response.data.message,
});

export const http = {
  get: (url, params) => api.get(url, { params }).then(unwrap),
  post: (url, body) => api.post(url, body).then(unwrap),
  patch: (url, body) => api.patch(url, body).then(unwrap),
  put: (url, body) => api.put(url, body).then(unwrap),
  delete: (url) => api.delete(url).then(unwrap),
};

export default api;
