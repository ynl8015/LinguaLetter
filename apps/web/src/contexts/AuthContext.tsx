import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ME } from '../lib/apollo';

interface User {
  id: string;
  email: string;
  name?: string;
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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // GraphQL 쿼리로 사용자 정보 가져오기
  const { data, loading, error, refetch } = useQuery(GET_ME, {
    skip: !localStorage.getItem('token'), // 토큰이 없으면 쿼리 실행하지 않음
    errorPolicy: 'all',
    onCompleted: (data) => {
      if (data?.me) {
        setUser(data.me);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setInitialLoading(false);
    },
    onError: (error) => {
      console.error('사용자 정보 조회 실패:', error);
      // 인증 실패 시 토큰 제거
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setInitialLoading(false);
    }
  });

  // 초기 로딩 시 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('저장된 사용자 데이터 파싱 실패:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    if (!token) {
      setInitialLoading(false);
    }
  }, []);

  const login = (userData: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
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
    loading: initialLoading || loading,
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