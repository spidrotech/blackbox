'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { authService } from '@/services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
}

export type { AuthContextType };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setUser(null);
        return;
      }
      
      const response = await authService.getMe();
      if (response.success && response.data) {
        setUser(response.data as User);
        setError(null);
      } else {
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login({ email, password });
      
      if (response.token || response.access_token) {
        // Attendre que le token soit stocké et lire l'état du localStorage
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Token non stocké');
        }
        
        // Attendre un bit que le localStorage soit synchronized
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Vérifier le user avec le nouveau token
        const meResponse = await authService.getMe();
        if (meResponse.success && meResponse.data) {
          setUser(meResponse.data as User);
          setError(null);
        } else {
          throw new Error('Impossible de récupérer les infos utilisateur');
        }
      } else {
        throw new Error('Aucun token retourné');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMsg);
      localStorage.removeItem('access_token');
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    authService.logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        error,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
