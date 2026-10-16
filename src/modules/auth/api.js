import { http } from "@/lib/api-client";

export const authApi = {
  login: (body) => http.post("/auth/login", body).then((res) => res.data),
  logout: () => http.post("/auth/logout"),
  logoutAll: () => http.post("/auth/logout-all"),
  me: () => http.get("/auth/me").then((res) => res.data),
  changePassword: (body) => http.post("/auth/change-password", body),
  forgotPassword: (body) => http.post("/auth/forgot-password", body),
  resetPassword: (body) => http.post("/auth/reset-password", body),
};
