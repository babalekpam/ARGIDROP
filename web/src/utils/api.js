import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('argidrop_refresh');
      if (refresh) {
        try {
          const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: refresh });
          const { access } = res.data.tokens;
          localStorage.setItem('argidrop_token', access);
          api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          original.headers['Authorization'] = `Bearer ${access}`;
          return api(original);
        } catch (refreshErr) {
          localStorage.removeItem('argidrop_token');
          localStorage.removeItem('argidrop_refresh');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
