// AuthCallback.tsx - 카카오 로그인 콜백 전용
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    const status = urlParams.get('status');

    console.log('AuthCallback - 받은 파라미터:', { token: !!token, error, status });

    // 카카오 로그인 시작 플래그 제거
    localStorage.removeItem('kakaoLoginStarted');

    // 에러 처리
    if (error) {
      console.error('카카오 인증 오류:', decodeURIComponent(error));
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    // 카카오 로그인 콜백 처리
    if (token && status) {
      if (status === 'CONSENT_REQUIRED') {
        // 동의서가 필요한 경우
        localStorage.setItem('kakaoTempToken', token);
        localStorage.setItem('kakaoAuthStatus', status);
        navigate('/login?kakao_consent=true');
      } else if (status === 'SUCCESS') {
        // 로그인 성공한 경우 - 구글처럼 처리
        localStorage.setItem('token', token);
        localStorage.setItem('kakaoAuthStatus', 'SUCCESS');
        
        // 성공 메시지 표시 후 대시보드로 이동 (구글 로그인과 동일한 패턴)
        navigate('/login?token=' + encodeURIComponent(token) + '&status=SUCCESS');
      } else {
        navigate('/login?error=unknown_status');
      }
    } else {
      navigate('/login?error=invalid_callback');
    }
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
        <p className="text-gray-600">처리 중...</p>
      </div>
    </div>
  );
}