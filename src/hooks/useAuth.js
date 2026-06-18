import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';

// Tracks the logged-in Spark account (when a backend is configured).
export function useAuth() {
  const [account, setAccount] = useState(null); // { email, plan, usage, limits }
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!api.isLoggedIn()) { setAccount(null); setLoading(false); return; }
    try {
      const me = await api.fetchMe();
      setAccount(me);
    } catch {
      api.logout();
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    await api.login(email, password);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (email, password) => {
    await api.register(email, password);
    await refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    api.logout();
    setAccount(null);
  }, []);

  return { account, loading, login, register, logout, refresh };
}
