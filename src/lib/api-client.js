import axios from "axios";

/**
 * Axios instance for the ERP API. Requests go to the same origin (/api/v1) and are forwarded
 * to the backend by the Next.js rewrite, so auth cookies stay first-party.
 *
 * Phase 1 adds: bearer access token header + automatic refresh on 401.
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data;
    return Promise.reject(
      new ApiError({
        status: error.response?.status ?? 0,
        message: body?.message ?? (error.response ? error.message : "Cannot reach the server"),
        errors: body?.errors ?? [],
      }),
    );
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
