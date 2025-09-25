// Login.tsx - 모든 로그인 로직 통합
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useMutation, useApolloClient } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { SUBMIT_CONSENT } from '../lib/apollo';
import { useNavigate, useLocation, Link } from 'react-router-dom';

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
  const [isKakaoLogin, setIsKakaoLogin] = useState(false); // 카카오 로그인 여부 추적

  const [submitConsent] = useMutation(SUBMIT_CONSENT);

  // URL 파라미터 처리 - AuthCallback에서 온 데이터 처리
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const errorParam = urlParams.get('error');
    const deletedParam = urlParams.get('deleted');
    const loggedOutParam = urlParams.get('logged_out');
    const kakaoConsentParam = urlParams.get('kakao_consent');
    
    console.log('Login.tsx URL 파라미터:', { errorParam, deletedParam, loggedOutParam, kakaoConsentParam });
    
    // 카카오 동의서 콜백 처리 (AuthCallback.tsx에서 리다이렉트)
    if (kakaoConsentParam === 'true') {
      const kakaoTempToken = localStorage.getItem('kakaoTempToken');
      const kakaoStatus = localStorage.getItem('kakaoAuthStatus');
      
      console.log('카카오 동의서 처리:', { kakaoTempToken: !!kakaoTempToken, kakaoStatus });
      
      if (kakaoTempToken && kakaoStatus === 'CONSENT_REQUIRED') {
        setIsKakaoLogin(true);
        setTempToken(kakaoTempToken);
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
        
        // 임시 데이터 정리
        localStorage.removeItem('kakaoTempToken');
        localStorage.removeItem('kakaoAuthStatus');
      }
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
    
    // 계정 삭제 메시지
    if (deletedParam === 'true') {
      setSuccessMessage('계정이 삭제되었습니다. 새로운 회원가입을 시도해주세요.');
      setMessageType('info');
      logout();
    }
    
    // 로그아웃 메시지
    if (loggedOutParam === 'true') {
      setSuccessMessage('로그아웃되었습니다.');
      setMessageType('success');
    }

    // URL 정리 - redirect 파라미터는 유지
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
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 6000);
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
      setIsKakaoLogin(false); // Google 로그인임을 표시
      
      if (credentialResponse.credential) {
        const userInfo: GoogleUser = jwtDecode(credentialResponse.credential);
        console.log('Google 로그인 시도:', userInfo.email);

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/google`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
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
          console.log('🔐 Google 인증 응답:', data.status);
          
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

  // 카카오 로그인 시작 - AuthCallback으로 리다이렉트됨
  const handleKakaoLogin = () => {
    if (loading) return;
    
    setLoading(true);
    const currentUrl = encodeURIComponent(window.location.href);
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${import.meta.env.VITE_KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(import.meta.env.VITE_KAKAO_REDIRECT_URI || 'http://localhost:4000/auth/kakao/callback')}&response_type=code&state=${currentUrl}`;
    window.location.href = kakaoAuthUrl;
  };

  // Google 로그인 에러
  const handleGoogleError = () => {
    console.error('Google 로그인 실패');
    setError('Google 로그인에 실패했습니다. 팝업이 차단되었거나 네트워크 문제일 수 있습니다.');
    setLoading(false);
  };

  // 동의서 제출 처리 (Google과 카카오 공통)
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

      console.log('동의서 제출 시작 - 카카오 로그인:', isKakaoLogin);
      localStorage.setItem('tempToken', tempToken);

      // GraphQL 뮤테이션으로 동의 제출
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
          headers: {
            authorization: `Bearer ${tempToken}`
          }
        }
      });

      if (result.data?.submitConsent) {
        console.log('동의서 제출 완료');
        
        // 동의 완료 후 정식 로그인 처리
        const success = await completeRegistration(tempToken);
        
        if (success) {
          console.log('회원가입 완료');
          localStorage.removeItem('tempToken');
          setShowConsentModal(false);
          setSuccessMessage('환영합니다! 잠시 후 이동합니다...');
          setMessageType('success');
          
          // Apollo Client 캐시 초기화 (새로운 토큰으로 쿼리 재실행을 위해)
          await apolloClient.resetStore();
          
          setTimeout(() => {
            const urlParams = new URLSearchParams(location.search);
            const redirectTo = urlParams.get('redirect') || '/dashboard';
            
            if (isKakaoLogin) {
              // 카카오 로그인의 경우 완전 새로고침
              window.location.href = redirectTo;
            } else {
              // Google 로그인의 경우 일반 navigation
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
    
    // 임시 저장된 데이터 모두 정리
    localStorage.removeItem('tempToken');
    localStorage.removeItem('kakaoTempToken');
    localStorage.removeItem('kakaoAuthStatus');
  };

  // 메시지 스타일
  const getMessageStyle = (type: 'success' | 'info' | 'warning') => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  // 메시지 아이콘
  const getMessageIcon = (type: 'success' | 'info' | 'warning') => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // 로딩 중
  if (status === 'LOADING') {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white relative">
      <div className="h-full flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-white border border-gray-200 rounded-[16px] p-8 shadow-sm">
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <img 
                    src="https://res.cloudinary.com/dahbfym6q/image/upload/v1758003572/%E1%84%85%E1%85%B5%E1%86%BC%E1%84%80%E1%85%AE%E1%84%8B%E1%85%A1%E1%84%85%E1%85%A6%E1%84%90%E1%85%A5%E1%84%85%E1%85%A9%E1%84%80%E1%85%A9_lfvtie.png" 
                    alt="LinguaLetter Logo" 
                    className="w-16 h-16 object-contain"
                  />
                </div>
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
              {/* Google Login */}
              <div>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="100%"
                  disabled={loading}
                />
              </div>

              {/* Kakao Login */}
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

            {loading && (
              <div className="mt-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
                <span className="ml-3 text-gray-600 text-sm">처리 중...</span>
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

      {/* Consent Modal */}
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