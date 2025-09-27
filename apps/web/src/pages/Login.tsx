// Login.tsx - 구글 버튼 스타일 개선
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useMutation, useApolloClient } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { SUBMIT_CONSENT } from '../lib/apollo';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LoadingAnimation from '../components/LoadingAnimation';

interface CredentialResponse {
  credential?: string;
  select_by?: string;
  clientId?: string;
}

interface GoogleUser {
  sub: string;
  name: string;
  email: string;
  picture: string;
  given_name: string;
  family_name: string;
}

interface ConsentData {
  required: boolean;
  currentVersions: {
    terms: string;
    privacy: string;
    newsletter: string;
  };
  latest: any;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, completeRegistration, status, logout } = useAuth();
  const apolloClient = useApolloClient();
  
  // 기본 상태
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'info' | 'warning'>('success');
  
  // 동의서 관련 상태
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [tempToken, setTempToken] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [isKakaoLogin, setIsKakaoLogin] = useState(false);

  const [submitConsent] = useMutation(SUBMIT_CONSENT);

  // URL 파라미터 처리
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const errorParam = urlParams.get('error');
    const deletedParam = urlParams.get('deleted');
    const loggedOutParam = urlParams.get('logged_out');
    const kakaoConsentParam = urlParams.get('kakao_consent');
    const tokenParam = urlParams.get('token');
    const statusParam = urlParams.get('status');
    const userParam = urlParams.get('user');
    
    // 카카오 동의서 콜백 처리
    if (kakaoConsentParam === 'true' && tokenParam && statusParam === 'CONSENT_REQUIRED') {
      setIsKakaoLogin(true);
      setTempToken(tokenParam);
      setConsentData({
        required: true,
        currentVersions: {
          terms: "1.0.0",
          privacy: "1.0.0", 
          newsletter: "1.0.0"
        },
        latest: null
      });
      setShowConsentModal(true);
    }
    
    // 성공적인 로그인 처리
    if (tokenParam && statusParam === 'SUCCESS') {
      localStorage.setItem('token', tokenParam);
      
      if (userParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error('사용자 정보 파싱 실패:', error);
        }
      }
      
      setSuccessMessage('로그인 성공!');
      setMessageType('success');
      setLoading(false);
      
      setTimeout(() => {
        const redirectTo = urlParams.get('redirect') || '/dashboard';
        window.location.href = redirectTo;
      }, 500);
    }
    
    // 에러 처리
    if (errorParam) {
      if (errorParam === 'auth_failed') {
        setError('인증에 실패했습니다. 다시 시도해주세요.');
      } else if (errorParam === 'invalid_callback') {
        setError('잘못된 로그인 요청입니다. 다시 시도해주세요.');
      } else if (errorParam === 'unknown_status') {
        setError('알 수 없는 인증 상태입니다. 다시 시도해주세요.');
      } else {
        setError(decodeURIComponent(errorParam));
      }
    }
    
    if (deletedParam === 'true') {
      setSuccessMessage('계정이 삭제되었습니다. 새로운 회원가입을 시도해주세요.');
      setMessageType('info');
      logout();
    }
    
    if (loggedOutParam === 'true') {
      setSuccessMessage('로그아웃되었습니다.');
      setMessageType('success');
    }

    // URL 정리
    if (errorParam || deletedParam || loggedOutParam || kakaoConsentParam) {
      setTimeout(() => {
        const redirectParam = urlParams.get('redirect');
        const newUrl = window.location.pathname + (redirectParam ? `?redirect=${redirectParam}` : '');
        window.history.replaceState({}, '', newUrl);
      }, 100);
    }
  }, [location, logout]);

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (status === 'AUTHENTICATED') {
      const urlParams = new URLSearchParams(location.search);
      const redirectTo = urlParams.get('redirect') || '/dashboard';
      navigate(redirectTo);
    }
  }, [status, navigate, location]);

  // 성공 메시지 자동 숨김
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Google 로그인 성공 처리
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      setIsKakaoLogin(false);
      
      if (credentialResponse.credential) {
        const userInfo: GoogleUser = jwtDecode(credentialResponse.credential);

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/google`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleToken: credentialResponse.credential,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            googleId: userInfo.sub
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.status === 'CONSENT_REQUIRED') {
            setConsentData(data.consents);
            setTempToken(data.token);
            setShowConsentModal(true);
            return;
          }
          
          if (data.status === 'SUCCESS') {
            login(data.user, data.token);
            setSuccessMessage('로그인 성공!');
            setMessageType('success');
            
            setTimeout(() => {
              const urlParams = new URLSearchParams(location.search);
              const redirectTo = urlParams.get('redirect') || '/dashboard';
              navigate(redirectTo);
            }, 1000);
          }
        } else {
          if (response.status === 202 && data.status === 'CONSENT_REQUIRED') {
            setConsentData(data.consents);
            setTempToken(data.token);
            setShowConsentModal(true);
          } else {
            setError(data.error || 'Google 로그인에 실패했습니다.');
          }
        }
      }
    } catch (error) {
      console.error('Google 로그인 처리 오류:', error);
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 카카오 로그인 시작
  const handleKakaoLogin = () => {
    if (loading) return;
    
    localStorage.setItem('kakaoLoginStarted', 'true');
    setLoading(true);
    
    const currentUrl = encodeURIComponent(window.location.href);
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${import.meta.env.VITE_KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(import.meta.env.VITE_KAKAO_REDIRECT_URI || 'http://localhost:4000/auth/kakao/callback')}&response_type=code&state=${currentUrl}`;
    
    setTimeout(() => {
      window.location.href = kakaoAuthUrl;
    }, 100);
  };

  // Google 로그인 에러
  const handleGoogleError = () => {
    console.error('Google 로그인 실패');
    setError('Google 로그인에 실패했습니다. 팝업이 차단되었거나 네트워크 문제일 수 있습니다.');
    setLoading(false);
  };

  // 동의서 제출 처리
  const handleConsentSubmit = async () => {
    if (!termsAccepted || !privacyAccepted) {
      setError('필수 항목에 동의해주세요.');
      return;
    }

    if (!tempToken || !consentData) {
      setError('인증 정보가 없습니다. 다시 로그인해주세요.');
      setShowConsentModal(false);
      return;
    }

    try {
      setConsentSubmitting(true);
      setError('');

      localStorage.setItem('tempToken', tempToken);

      const result = await submitConsent({
        variables: {
          input: {
            termsAccepted,
            privacyAccepted,
            newsletterOptIn: false,
            termsVersion: consentData.currentVersions.terms,
            privacyVersion: consentData.currentVersions.privacy,
            newsletterVersion: consentData.currentVersions.newsletter
          }
        },
        context: {
          headers: { authorization: `Bearer ${tempToken}` }
        }
      });

      if (result.data?.submitConsent) {
        const success = await completeRegistration(tempToken);
        
        if (success) {
          localStorage.removeItem('tempToken');
          setShowConsentModal(false);
          setSuccessMessage('환영합니다! 잠시 후 이동합니다...');
          setMessageType('success');
          
          await apolloClient.resetStore();
          
          setTimeout(() => {
            const urlParams = new URLSearchParams(location.search);
            const redirectTo = urlParams.get('redirect') || '/dashboard';
            
            if (isKakaoLogin) {
              window.location.href = redirectTo;
            } else {
              navigate(redirectTo, { replace: true });
            }
          }, 2000);
        } else {
          setError('회원가입 완료 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
      }
    } catch (error: any) {
      console.error('동의 제출 오류:', error);
      
      let errorMessage = '동의 제출 중 오류가 발생했습니다.';
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage = error.graphQLErrors[0].message;
      } else if (error.networkError) {
        if (error.networkError.statusCode === 401) {
          errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
          handleConsentCancel();
        } else {
          errorMessage = '네트워크 오류가 발생했습니다.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setConsentSubmitting(false);
      localStorage.removeItem('tempToken');
    }
  };

  // 동의서 취소
  const handleConsentCancel = () => {
    setShowConsentModal(false);
    setConsentData(null);
    setTempToken('');
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    setError('');
    setIsKakaoLogin(false);
    
    localStorage.removeItem('tempToken');
    localStorage.removeItem('kakaoTempToken');
    localStorage.removeItem('kakaoAuthStatus');
  };

  // 메시지 스타일 및 아이콘 함수들
  const getMessageStyle = (type: 'success' | 'info' | 'warning') => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-700';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getMessageIcon = (type: 'success' | 'info' | 'warning') => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'success':
        return <svg className={`${iconClass} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
      case 'info':
        return <svg className={`${iconClass} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'warning':
        return <svg className={`${iconClass} text-amber-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>;
      default: return null;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white relative">
      {/* 🔥 완전히 개선된 구글 버튼 스타일 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* 구글 로그인 컨테이너 */
          .google-login-container {
            width: 100% !important;
            position: relative !important;
          }
          
          /* 구글 버튼의 최상위 컨테이너 완전 리셋 */
          .google-login-container > div,
          .google-login-container > div > div,
          .google-login-container > div > div > div,
          .google-login-container iframe {
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
            background: transparent !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* 구글 버튼 메인 컨테이너 강제 스타일링 */
          .google-login-container > div {
            width: 100% !important;
            height: 48px !important;
            background: white !important;
            border: 1px solid #d1d5db !important;
            border-radius: 8px !important;
            transition: all 0.2s ease !important;
            overflow: hidden !important;
            position: relative !important;
          }
          
          /* 호버 효과 */
          .google-login-container > div:hover {
            background: #f9fafb !important;
            border-color: #9ca3af !important;
          }
          
          /* 구글 버튼 내부 모든 요소들 */
          .google-login-container * {
            box-sizing: border-box !important;
          }
          
          /* 구글 아이콘과 텍스트 영역 */
          .google-login-container [role="button"],
          .google-login-container button {
            width: 100% !important;
            height: 48px !important;
            border: none !important;
            background: transparent !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            color: #374151 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 12px !important;
            cursor: pointer !important;
            padding: 0 16px !important;
          }
          
          /* 구글 로고 크기 조정 */
          .google-login-container svg,
          .google-login-container img {
            width: 20px !important;
            height: 20px !important;
            flex-shrink: 0 !important;
          }
          
          /* 텍스트 스타일 */
          .google-login-container span {
            font-family: inherit !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            color: #374151 !important;
          }
        `
      }} />
      
      <div className="h-full flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-white border border-gray-200 rounded-[16px] p-8 shadow-sm">
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <img 
                  src="https://res.cloudinary.com/dahbfym6q/image/upload/v1758003572/%E1%84%85%E1%85%B5%E1%86%BC%E1%84%80%E1%85%AE%E1%84%8B%E1%85%A1%E1%84%85%E1%85%A6%E1%84%90%E1%85%A5%E1%84%85%E1%85%A9%E1%84%80%E1%85%A9_lfvtie.png" 
                  alt="LinguaLetter Logo" 
                  className="w-16 h-16 object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                LinguaLetter
              </h1>
              <div className="space-y-1">
                <p className="text-gray-600 font-medium">직역을 넘어서, 한국을 영어로 풀어내는 뉴스레터</p>
                <p className="text-gray-500 text-sm">간편하게 로그인하고 시작하세요</p>
              </div>
            </div>

            {/* Success/Info Message */}
            {successMessage && (
              <div className={`mb-6 p-4 border rounded-[12px] text-sm ${getMessageStyle(messageType)}`}>
                <div className="flex items-start space-x-3">
                  {getMessageIcon(messageType)}
                  <span className="flex-1">{successMessage}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] text-red-600 text-sm">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="flex-1">{error}</span>
                </div>
              </div>
            )}

            {/* Login Buttons */}
            <div className="space-y-4">
              {/* 🔥 개선된 Google Login */}
              <div className={`google-login-container ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="100%"
                />
              </div>

              {/* Kakao Login - 기존과 동일 */}
              <button
                onClick={handleKakaoLogin}
                disabled={loading}
                className="w-full bg-[#FEE500] hover:bg-[#FCDD00] text-[#3C1E1E] font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C7.03 3 3 6.25 3 10.25c0 2.57 1.7 4.85 4.28 6.15L6.5 20.28c-.1.15-.02.34.15.39l4.85-2.32c.5.03 1 .03 1.5 0l4.85 2.32c.17-.05.25-.24.15-.39l-.78-3.88C20.3 15.1 22 12.82 22 10.25 22 6.25 17.97 3 12 3z"/>
                </svg>
                {loading ? '로그인 중...' : '카카오로 시작하기'}
              </button>
            </div>

            {/* 로딩 오버레이 */}
            {loading && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                <LoadingAnimation size="medium" message="처리 중..." />
              </div>
            )}
          </div>

          {/* Bottom Text */}
          <p className="text-center text-xs text-gray-400 mt-6">
            안전하고 빠른 소셜 로그인으로 시작하세요
          </p>

          {/* Footer Links */}
          <div className="flex justify-center space-x-4 mt-4">
            <Link to="/terms" className="text-xs text-gray-400 hover:text-gray-600 underline">
              이용약관
            </Link>
            <Link to="/privacy" className="text-xs text-gray-400 hover:text-gray-600 underline">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>

      {/* Consent Modal - 기존과 동일 */}
      {showConsentModal && consentData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[16px] w-full max-w-lg shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  서비스 이용을 위한 동의
                </h3>
                <button
                  onClick={handleConsentCancel}
                  disabled={consentSubmitting}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                정식 서비스 이용을 위해 필수 항목에 동의해주세요.
                {isKakaoLogin && <span className="text-blue-600"> (카카오 계정)</span>}
              </p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={consentSubmitting}
                />
                <span className="text-sm text-gray-800">
                  [필수] 서비스 이용약관 동의 (v{consentData.currentVersions.terms})
                  <Link to="/terms" className="ml-2 text-blue-600 underline hover:text-blue-800" target="_blank">
                    보기
                  </Link>
                </span>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  disabled={consentSubmitting}
                />
                <span className="text-sm text-gray-800">
                  [필수] 개인정보 처리방침 동의 (v{consentData.currentVersions.privacy})
                  <Link to="/privacy" className="ml-2 text-blue-600 underline hover:text-blue-800" target="_blank">
                    보기
                  </Link>
                </span>
              </label>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  <div className="flex items-start space-x-3">
                    <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="flex-1">{error}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleConsentSubmit}
                disabled={!termsAccepted || !privacyAccepted || consentSubmitting}
                className={`w-full py-3 px-4 rounded-[12px] text-sm font-semibold transition-colors ${
                  !termsAccepted || !privacyAccepted || consentSubmitting
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {consentSubmitting ? '처리 중...' : '동의하고 시작하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}