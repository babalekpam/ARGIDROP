import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('argidrop_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(res => { setUser(res.data.user); setProfile(res.data.profile); })
        .catch(() => { localStorage.removeItem('argidrop_token'); localStorage.removeItem('argidrop_refresh'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { tokens, user, profile } = res.data;
    localStorage.setItem('argidrop_token', tokens.access);
    localStorage.setItem('argidrop_refresh', tokens.refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
    setUser(user);
    setProfile(profile);
    return { ...user, isIndividual: !!profile?.isIndividual };
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const { tokens, user } = res.data;
    localStorage.setItem('argidrop_token', tokens.access);
    localStorage.setItem('argidrop_refresh', tokens.refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('argidrop_token');
    localStorage.removeItem('argidrop_refresh');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
