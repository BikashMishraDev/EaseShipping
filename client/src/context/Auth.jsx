import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, loadMe } from '../services/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: null });

  const refresh = useCallback(async () => {
    try {
      const { user } = await loadMe();
      setState({ user, loading: false, error: null });
    } catch (e) {
      setState({ user: null, loading: false, error: e.message });
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST', body: {} });
    await refresh();
  };
  return <Ctx.Provider value={{ ...state, refresh, logout }}>{children}</Ctx.Provider>;
}
