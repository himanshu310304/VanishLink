import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const STORAGE_USER = 'deadman_user';
const STORAGE_TOKEN = 'deadman_token';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_USER);
        const storedToken = localStorage.getItem(STORAGE_TOKEN);

        if (storedToken) {
          api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
        }

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth bootstrap failed', error);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem(STORAGE_TOKEN, token);
    }
    localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);