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
  login: (userData: User, token: string) => void;
  logout: () => Promise<void>;
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
  const [hasToken, setHasToken] = useState(!!localStorage.getItem('token'));

  // GraphQL 쿼리로 사용자 정보 가져오기 (토큰이 있을 때만)
  const { data, loading, error, refetch } = useQuery(GET_ME, {
    skip: !hasToken,
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  // GraphQL 응답 처리에서
useEffect(() => {
  const currentToken = localStorage.getItem('token');
  setHasToken(!!currentToken);
  
  if (!currentToken) {
    // 토큰이 없으면 로그아웃 상태
    setUser(null);
    setIsAuthenticated(false);
    setInitialized(true);
    return;
  }

  if (loading) return;

  if (error) {
    // GraphQL 에러가 발생하면 (예: 토큰 만료, 유효하지 않은 토큰, 계정 삭제, 동의서 없음)
    console.error('Auth error:', error);
    
    // 동의서 관련 오류인지 확인
    if (error.message?.includes('consent not found') || error.message?.includes('account may have been deleted')) {
      console.log('Account deleted or consent missing - redirecting to login');
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setHasToken(false);
    setUser(null);
    setIsAuthenticated(false);
    setInitialized(true);
    return;
  }

  if (data?.me) {
    const userData = data.me;
    // localStorage와 상태를 동시에 업데이트
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  } else if (data && !data.me) {
    // 쿼리는 성공했지만 사용자 데이터가 없음 (삭제된 계정)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setHasToken(false);
    setUser(null);
    setIsAuthenticated(false);
  }
  
  setInitialized(true);
}, [data, loading, error]);

  

  const login = (userData: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setHasToken(true);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      // 서버에 로그아웃 요청
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/logout`, {
          method: 'POST',
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
      setHasToken(false);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refetchUser = () => {
    if (localStorage.getItem('token')) {
      refetch();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading: !initialized, // 초기화가 완료되지 않았으면 로딩 중
    login,
    logout,
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