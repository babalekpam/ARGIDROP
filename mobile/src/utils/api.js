import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('argidrop_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      const refresh = await SecureStore.getItemAsync('argidrop_refresh');
      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh });
          await SecureStore.setItemAsync('argidrop_token', res.data.tokens.access);
          // The backend now rotates the refresh token too (and embeds the
          // current pwdAt claim into it), so persist whichever one came back.
          if (res.data.tokens.refresh) {
            await SecureStore.setItemAsync('argidrop_refresh', res.data.tokens.refresh);
          }
          err.config.headers.Authorization = `Bearer ${res.data.tokens.access}`;
          return api(err.config);
        } catch {
          await SecureStore.deleteItemAsync('argidrop_token');
          await SecureStore.deleteItemAsync('argidrop_refresh');
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
