import React, { createContext, useState, useCallback, useEffect } from 'react';
import { setToken as setTokenInStore, getToken as getTokenFromStore, setUseLocalStorage } from '../utils/tokenStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null); // null=unknown, true/false
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

  // detect backend health on mount
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        // use AbortController to implement a real timeout
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(`${API_BASE}/api/applications/health`, { method: 'GET', signal: ctrl.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('health check failed');
        const body = await res.json();
        console.log('AuthContext: health response', body);
        if (!cancelled) {
          const online = !!body.mongoConnected;
          setBackendOnline(online);
          // when backend is online, stop using localStorage for token persistence
          setUseLocalStorage(!online);
          if (!online) {
            // backend offline: load persisted token if present
            try {
              const stored = localStorage.getItem('authToken');
              if (stored) {
                setAuthToken(stored);
                setUser(JSON.parse(localStorage.getItem('user') || 'null'));
                setUserRole(localStorage.getItem('userRole') || null);
                setIsAuthenticated(!!stored);
                setTokenInStore(stored);
              }
            } catch (e) {}
          } else {
            // backend online: prefer in-memory token (clear any stale local persist)
            setTokenInStore(null);
            try { localStorage.removeItem('authToken'); localStorage.removeItem('user'); localStorage.removeItem('userRole'); } catch(e){}
          }
          console.log('AuthContext: backendOnline set to', online);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('AuthContext: health check failed', err && err.message);
          setBackendOnline(false);
          setUseLocalStorage(true);
          try {
            const stored = localStorage.getItem('authToken');
            if (stored) {
              setAuthToken(stored);
              setUser(JSON.parse(localStorage.getItem('user') || 'null'));
              setUserRole(localStorage.getItem('userRole') || null);
              setIsAuthenticated(!!stored);
              setTokenInStore(stored);
            }
          } catch (e) {}
          console.log('AuthContext: backendOnline set to false, loaded local token? ', !!localStorage.getItem('authToken'));
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, [API_BASE]);

  // login: accepts credentials from UI and calls backend when possible
  const login = useCallback(async (payload) => {
    setLoading(true);
    try {
      // payload may be credentials { email, password } or an already-constructed user object
      // If backendOnline is null (unknown), still try the backend optimistically.
      if (payload && payload.email && payload.password && (backendOnline || backendOnline === null)) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: payload.email, password: payload.password }),
        });
        if (!res.ok) throw new Error('Login failed');
        const body = await res.json();
        const token = body.token;
        const refreshToken = body.refreshToken;
        const userData = body.user;
        setUser(userData);
        setUserRole(userData.role);
        setIsAuthenticated(true);
        setAuthToken(token);
        // set token in tokenStore (in-memory if backendOnline)
        setTokenInStore(token);
        if (!backendOnline) {
          try {
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('userRole', userData.role);
            localStorage.setItem('authToken', token);
          } catch(e){}
        }
        return userData;
      }

      // fallback / legacy usage: payload is a user object (mocked)
      if (payload && payload.token) {
        setUser(payload);
        setUserRole(payload.role);
        setIsAuthenticated(true);
        setAuthToken(payload.token);
        setTokenInStore(payload.token);
        if (!backendOnline) {
          try {
            localStorage.setItem('user', JSON.stringify(payload));
            localStorage.setItem('userRole', payload.role);
            localStorage.setItem('authToken', payload.token);
          } catch(e){}
        }
        return payload;
      }

      return null;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [API_BASE, backendOnline]);

  const logout = useCallback(async () => {
    setUser(null);
    setUserRole(null);
    setIsAuthenticated(false);
    setAuthToken(null);
    setTokenInStore(null);
    try { localStorage.removeItem('user'); localStorage.removeItem('userRole'); localStorage.removeItem('authToken'); } catch(e){}
    // notify server to revoke refresh token if possible: caller should handle sending refresh token
  }, []);

  const signup = useCallback(async (userData) => {
    setLoading(true);
    try {
      // If backendOnline is unknown (null) try backend optimistically; fallback only on explicit failure.
      if (backendOnline || backendOnline === null) {
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
        if (!res.ok) throw new Error('Signup failed');
        const body = await res.json();
        const token = body.token;
        const refreshToken = body.refreshToken;
        const userObj = body.user;
        setUser(userObj);
        setUserRole(userObj.role);
        setIsAuthenticated(true);
        setAuthToken(token);
        setTokenInStore(token);
        return userObj;
      }

      // fallback: local signup mock
      const newUser = {
        ...userData,
        id: 'user_' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      setUser(newUser);
      setUserRole(userData.role);
      setIsAuthenticated(true);
      const token = 'mock-token-' + Date.now();
      setAuthToken(token);
      setTokenInStore(token);
      try { localStorage.setItem('user', JSON.stringify(newUser)); localStorage.setItem('userRole', userData.role); localStorage.setItem('authToken', token); } catch(e){}
      return newUser;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [API_BASE, backendOnline]);

  const updateProfile = useCallback((updatedData) => {
    const updated = { ...user, ...updatedData };
    setUser(updated);
    try { localStorage.setItem('user', JSON.stringify(updated)); } catch(e){}
  }, [user]);

  const value = {
    user,
    isAuthenticated,
    userRole,
    authToken,
    backendOnline,
    loading,
    login,
    logout,
    signup,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
