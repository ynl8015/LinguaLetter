import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { jwtDecode } from 'jwt-decode';

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, refetchUser } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    // 에러 처리 추가
    if (error) {
      console.error('인증 오류:', decodeURIComponent(error));
      navigate('/login?error=auth_failed');
      return;
    }

    if (token) {
      localStorage.setItem('token', token);
      
      try {
        const decoded = jwtDecode(token);
        console.log('Decoded:', decoded); // 구조 확인용
        
        const userData = {
          id: decoded.userId || decoded.sub,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
          provider: decoded.provider || 'google',
          picture: decoded.picture,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        
        login(userData, token);
        navigate('/dashboard');
      } catch (error) {
        console.error('토큰 디코딩 실패:', error);
        // 디코딩 실패시 기존 방식 사용
        refetchUser();
        setTimeout(() => navigate('/dashboard'), 1000); // 약간의 지연
      }
    } else {
      navigate('/login?error=no_token');
    }
  }, [location, login, navigate, refetchUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
}