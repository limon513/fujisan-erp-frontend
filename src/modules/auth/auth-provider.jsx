"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshAccessToken, setAccessToken, setAuthFailureHandler } from "@/lib/api-client";
import { authApi } from "./api";

const AuthContext = createContext(null);

// Set by the backend; only a hint for routing, it grants nothing.
const SESSION_HINT = "erp_session";
const hasSessionHint = () =>
  document.cookie.split("; ").some((c) => c.startsWith(`${SESSION_HINT}=`));
const clearSessionHint = () => {
  document.cookie = `${SESSION_HINT}=; Max-Age=0; path=/`;
};

/**
 * Session state for the whole app.
 *   status: "loading" | "authenticated" | "unauthenticated"
 *   user:   GET /auth/me payload (role, employee, permissions)
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState({ status: "loading", user: null });

  const signedOut = useCallback(() => {
    setAccessToken(null);
    clearSessionHint();
    queryClient.clear();
    setState({ status: "unauthenticated", user: null });
  }, [queryClient]);

  // Restore the session after a page load using the refresh cookie
  useEffect(() => {
    setAuthFailureHandler(signedOut);
    let cancelled = false;

    (async () => {
      if (!hasSessionHint()) return signedOut();
      try {
        await refreshAccessToken();
        const user = await authApi.me();
        if (!cancelled) setState({ status: "authenticated", user });
      } catch {
        if (!cancelled) signedOut();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedOut]);

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    setAccessToken(result.accessToken);
    setState({ status: "authenticated", user: result.user });
    return result.user;
  }, []);

  const logout = useCallback(
    async ({ everywhere = false } = {}) => {
      try {
        await (everywhere ? authApi.logoutAll() : authApi.logout());
      } finally {
        signedOut();
      }
    },
    [signedOut],
  );

  const reloadUser = useCallback(async () => {
    const user = await authApi.me();
    setState({ status: "authenticated", user });
    return user;
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, reloadUser }),
    [state, login, logout, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** Permission check for UI (the API enforces it regardless). */
export function useCan() {
  const { user } = useAuth();
  return useCallback(
    (permission) => Boolean(user && (user.isSuperAdmin || user.permissions?.[permission])),
    [user],
  );
}

/** Renders children only when the user holds the permission. */
export function Can({ permission, children, fallback = null }) {
  const can = useCan();
  return can(permission) ? children : fallback;
}
