import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../../../shared/types';
import { ROLE_PERMISSIONS } from '../../../shared/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginPassword: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session if available in localStorage
    const savedUser = localStorage.getItem('bt_user');
    const savedToken = localStorage.getItem('bt_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem('bt_user');
        localStorage.removeItem('bt_token');
      }
    }
    setIsLoading(false);
  }, []);

  const loginPassword = async (username: string, pass: string) => {
    try {
      const res = await window.api.loginPassword({ username, password: pass });
      if (res.success && res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('bt_user', JSON.stringify(res.user));
        localStorage.setItem('bt_token', res.token);
        return { success: true };
      }
      return { success: false, error: res.error || 'Authentication failed.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const loginPin = async (pin: string) => {
    try {
      const res = await window.api.loginPin({ pin });
      if (res.success && res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('bt_user', JSON.stringify(res.user));
        localStorage.setItem('bt_token', res.token);
        return { success: true };
      }
      return { success: false, error: res.error || 'Incorrect PIN.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('bt_user');
    localStorage.removeItem('bt_token');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const perms = (ROLE_PERMISSIONS as any)[user.role] || [];
    return perms.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, loginPassword, loginPin, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
