import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';

interface AuthContextType {
  authState: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (name: string, avatar: string, mobile: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  error: string | null;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('smartspend_token');
  const headers = {
    ...options.headers as Record<string, string>,
    'Content-Type': 'application/json',
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('smartspend_token'),
    isLoading: true,
  });
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const storedToken = localStorage.getItem('smartspend_token');
      if (!storedToken) {
        setAuthState({ user: null, token: null, isLoading: false });
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAuthState({
            user: data.user,
            token: storedToken,
            isLoading: false,
          });
        } else {
          // Token is invalid/expired
          localStorage.removeItem('smartspend_token');
          setAuthState({ user: null, token: null, isLoading: false });
        }
      } catch (err) {
        console.error('Failed to verify token:', err);
        setAuthState({ user: null, token: storedToken, isLoading: false });
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Invalid parameters.');
      }

      localStorage.setItem('smartspend_token', data.token);
      setAuthState({
        user: data.user,
        token: data.token,
        isLoading: false,
      });
    } catch (err: any) {
      setError(err.message || 'Server error during login.');
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      localStorage.setItem('smartspend_token', data.token);
      setAuthState({
        user: data.user,
        token: data.token,
        isLoading: false,
      });
    } catch (err: any) {
      setError(err.message || 'Server error during registration.');
      throw err;
    }
  };

  const updateProfile = async (name: string, avatar: string, mobile: string) => {
    setError(null);
    try {
      const response = await authFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, avatar, mobile }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setAuthState(prev => ({
        ...prev,
        user: data.user,
      }));
    } catch (err: any) {
      setError(err.message || 'Server error during profile update.');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logging out server session failed, clearing locally', e);
    }
    localStorage.removeItem('smartspend_token');
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
    });
  };

  const verifyOtp = async (email: string, otp: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      setAuthState(prev => {
        if (prev.user) {
          return {
            ...prev,
            user: { ...prev.user, isVerified: true }
          };
        }
        return prev;
      });
    } catch (err: any) {
      setError(err.message || 'Server error during verification.');
      throw err;
    }
  };

  const resendOtp = async (email: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Server error during OTP request.');
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ authState, login, register, updateProfile, logout, error, clearError, verifyOtp, resendOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be activated inside an AuthProvider');
  }
  return context;
}
