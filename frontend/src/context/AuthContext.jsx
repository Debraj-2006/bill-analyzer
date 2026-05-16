/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx — Global authentication state
import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [userEmail, setUserEmail] = useState(() => {
    const t = localStorage.getItem('token');
    if (!t) return null;
    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(t.split('.')[1]));
      return payload.sub || null;
    } catch {
      return null;
    }
  });

  const login = useCallback((newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      setUserEmail(payload.sub || null);
    } catch {
      setUserEmail(null);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUserEmail(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, userEmail, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
