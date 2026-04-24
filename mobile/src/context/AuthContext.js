import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const token = await SecureStore.getItemAsync('argidrop_token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/auth/me');
        // Attach driverProfile directly to user for navigator access
        const userData = {
          ...res.data.user,
          driverProfile: res.data.profile || null
        };
        setUser(userData);
      }
    } catch (e) {
      await SecureStore.deleteItemAsync('argidrop_token');
      await SecureStore.deleteItemAsync('argidrop_refresh');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { tokens, user: userData, profile } = res.data;
    await SecureStore.setItemAsync('argidrop_token', tokens.access);
    await SecureStore.setItemAsync('argidrop_refresh', tokens.refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
    const fullUser = { ...userData, driverProfile: profile || null };
    setUser(fullUser);
    return fullUser;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const { tokens, user: userData } = res.data;
    await SecureStore.setItemAsync('argidrop_token', tokens.access);
    await SecureStore.setItemAsync('argidrop_refresh', tokens.refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
    const fullUser = { ...userData, driverProfile: null };
    setUser(fullUser);
    return fullUser;
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const fullUser = { ...res.data.user, driverProfile: res.data.profile || null };
      setUser(fullUser);
      return fullUser;
    } catch (e) {
      console.error('refreshUser error:', e);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('argidrop_token');
    await SecureStore.deleteItemAsync('argidrop_refresh');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
