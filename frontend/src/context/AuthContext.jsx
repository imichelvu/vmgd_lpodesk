import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

// Only source: frontend .env. Use /api for local dev (Vite proxy). Prod: set VITE_API_URL (e.g. https://api.example.com/api).
const API_BASE = (import.meta.env.VITE_API_URL ?? '').trim() || '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => localStorage.getItem('lpo_token'));
  const [loading, setLoading] = useState(!!token);

  const setToken = useCallback((t) => {
    if (t) localStorage.setItem('lpo_token', t);
    else localStorage.removeItem('lpo_token');
    setTokenState(t);
  }, []);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (res.ok && text) {
        try {
          const data = JSON.parse(text);
          setUser(data);
        } catch {
          setToken(null);
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token, setToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (emailOrUsername, password) => {
    const url = `${API_BASE.replace(/\/$/, '')}/auth/login`;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrUsername, password }),
      });
    } catch (err) {
      throw new Error('Cannot reach server. Is the backend running? Use Troubleshoot below to check.');
    }
    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(res.ok ? 'Invalid response from server' : 'Server error. Check backend is running.');
      }
    }
    if (!res.ok) throw new Error(data.error || res.statusText || 'Login failed');
    if (!data.token || !data.user) throw new Error('Invalid response from server');
    setToken(data.token);
    setUser(data.user);
    return data;
  }, [setToken]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken]);

  const hasRole = useCallback((roleId) => {
    const ids = user?.role_ids || [];
    return Array.isArray(roleId) ? roleId.some((r) => ids.includes(r)) : ids.includes(roleId);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    hasRole,
    fetchUser,
    apiBase: API_BASE,
    api: (path, options = {}) => {
      const headers = { ...options.headers };
      if (token) headers.Authorization = `Bearer ${token}`;
      return fetch(`${API_BASE}${path}`, { ...options, headers });
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Role IDs for frontend routing and permissions (numeric)
export const ROLE_IDS = {
  Staff: 1,
  PSO: 2,
  Manager: 3,
  Director: 4,
  Admin: 5,
  ICTManager: 6,
  Procurement: 7,
};
