import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
      
      // AuthContext가 토큰을 인식하도록 refetch 트리거
      refetchUser();
      
      // 더 안전한 방법: 상태 변화를 기다리지 말고 바로 이동
      navigate('/dashboard');
    } else {
      navigate('/login?error=no_token');
    }
  }, [location, navigate, refetchUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
}