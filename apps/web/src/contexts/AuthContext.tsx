// AuthContext.tsx - 전역 인증 상태 관리
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ME } from '../lib/apollo';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'USER' | 'ADMIN';
  picture?: string;
  provider: string;
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  status: 'LOADING' | 'AUTHENTICATED' | 'CONSENT_REQUIRED' | 'UNAUTHENTICATED';
  login: (userData: User, token: string) => void;
  logout: () => Promise<void>;
  completeRegistration: (tempToken: string) => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'ADMIN' || user?.email === 'yuunalee1050@gmail.com';
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState<'LOADING' | 'AUTHENTICATED' | 'CONSENT_REQUIRED' | 'UNAUTHENTICATED'>('LOADING');
  const [hasToken, setHasToken] = useState(!!localStorage.getItem('token'));
  
  // 토큰 자동 갱신을 위한 interval
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // GraphQL 쿼리로 사용자 정보 가져오기
  const { data, loading, error, refetch } = useQuery(GET_ME, {
    skip: !hasToken,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  // 토큰 자동 갱신 함수
  const refreshTokenFunc = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.token) {
          localStorage.setItem('token', result.token);
          setHasToken(true);
          if (result.user) {
            setUser(result.user);
            localStorage.setItem('user', JSON.stringify(result.user));
          }
          return true;
        }
      }
      
      await logout();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    }
  };

  // 토큰 자동 갱신 스케줄링 (1시간마다)
  useEffect(() => {
    if (isAuthenticated && !refreshInterval) {
      const interval = setInterval(async () => {
        const success = await refreshTokenFunc();
        if (!success) {
          clearInterval(interval);
          setRefreshInterval(null);
        }
      }, 60 * 60 * 1000); // 1시간

      setRefreshInterval(interval);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated]);

  // 사용자 데이터 처리
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // 토큰이 없으면 미인증 상태로 설정
    if (!currentToken) {
      setUser(null);
      setIsAuthenticated(false);
      setStatus('UNAUTHENTICATED');
      setInitialized(true);
      return;
    }

    // 로컬 스토리지에 사용자 정보가 있으면 먼저 설정
    if (storedUser && !user) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setStatus('AUTHENTICATED');
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }

    if (loading) return;

    if (error) {
      console.error('Auth error:', error);
      
      // 동의서 관련 오류나 계정 삭제 오류 처리
      if (error.message?.includes('consent not found') || 
          error.message?.includes('account may have been deleted') ||
          error.message?.includes('User not found') ||
          error.message?.includes('Consent not found or expired') ||
          error.message?.includes('동의서 작성을 완료해주세요')) {
        console.log('Account issue detected - clearing auth state');
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setHasToken(false);
      setUser(null);
      setIsAuthenticated(false);
      setStatus('UNAUTHENTICATED');
      setInitialized(true);
      return;
    }

    if (data?.me) {
      const userData = data.me;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      setStatus('AUTHENTICATED');
    } else if (data && !data.me) {
      // 쿼리는 성공했지만 사용자 데이터가 없음 (삭제된 계정)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setHasToken(false);
      setUser(null);
      setIsAuthenticated(false);
      setStatus('UNAUTHENTICATED');
    }
    
    setInitialized(true);
  }, [data, loading, error, user]);

  // 로그인 함수 (토큰과 사용자 정보 저장)
  const login = (userData: User, token: string) => {
    console.log('AuthContext login called:', userData.email);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setHasToken(true);
    setUser(userData);
    setIsAuthenticated(true);
    setStatus('AUTHENTICATED');
  };

  // 동의서 완료 후 정식 로그인 처리
  const completeRegistration = async (tempToken: string): Promise<boolean> => {
    try {
      console.log('AuthContext completeRegistration called');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/complete-registration`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tempToken })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.token && result.user) {
          console.log('Registration completed, updating auth state');
          localStorage.setItem('token', result.token);
          localStorage.setItem('user', JSON.stringify(result.user));
          setHasToken(true);
          setUser(result.user);
          setIsAuthenticated(true);
          setStatus('AUTHENTICATED');
          return true;
        }
      } else {
        console.error('Registration completion failed:', await response.text());
      }
      
      return false;
    } catch (error) {
      console.error('Registration completion failed:', error);
      return false;
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
    } finally {
      // 클라이언트 측 정리
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('tempToken');
      localStorage.removeItem('kakaoTempToken');
      localStorage.removeItem('kakaoAuthStatus');
      setHasToken(false);
      setUser(null);
      setIsAuthenticated(false);
      setStatus('UNAUTHENTICATED');
      
      // 토큰 갱신 인터벌 정리
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  };

  // 사용자 정보 다시 가져오기
  const refetchUser = () => {
    if (localStorage.getItem('token')) {
      refetch();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading: !initialized,
    status,
    login,
    logout,
    completeRegistration,
    refreshToken: refreshTokenFunc,
    refetchUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};