import { createContext, useContext, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('baymax_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('baymax_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (correo, contrasena) => {
    const { data } = await axiosClient.post('/auth/login', { correo, contrasena });

    const accessToken = data.access_token;
    const payload = parseJwt(accessToken);

    const userData = {
      id: data.usuario_id || payload.sub || '',
      nombre: data.nombre || correo.split('@')[0],
      correo: data.correo || correo,
      rol: data.rol || payload.rol || 'PACIENTE',
    };

    localStorage.setItem('baymax_token', accessToken);
    localStorage.setItem('baymax_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);

    return userData;
  };

  const register = async (datosRegistro) => {
    const { data } = await axiosClient.post('/auth/registro', datosRegistro);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('baymax_token');
    localStorage.removeItem('baymax_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);