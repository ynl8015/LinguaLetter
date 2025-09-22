import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useMutation } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { SUBMIT_CONSENT } from '../lib/apollo';

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
  const [error, setError] = useState('');
  const { login } = useAuth();
  
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);

  const [submitConsent] = useMutation(SUBMIT_CONSENT);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (credentialResponse.credential) {
        const userInfo: GoogleUser = jwtDecode(credentialResponse.credential);
        console.log('Google 로그인 성공:', userInfo);

        // REST API로 Google 인증 처리
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/google`, {
          method: 'POST',
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

        if (response.ok) {
          console.log('🔍 로그인 성공 데이터:', data);
          
          // 동의 필요 시 모달 표시
          if (data?.consents?.required) {
            setConsentData(data.consents);
            setShowConsentModal(true);
            // 임시로 토큰 저장 (동의 완료 후 정식 로그인)
            localStorage.setItem('tempToken', data.token);
            localStorage.setItem('tempUser', JSON.stringify(data.user));
            return;
          }
          
          // AuthContext를 통해 로그인 상태 업데이트
          login(data.user, data.token);
          
          // 이전 페이지로 리다이렉트
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get('redirect') || '/dashboard';
          window.location.href = redirectTo;
        } else {
          setError(data.message || 'Google 로그인에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Google 로그인 처리 오류:', error);
      setError('Google 로그인 중 오류가 발생했습니다.');
    }
  };

  const handleKakaoLogin = () => {
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${import.meta.env.VITE_KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(import.meta.env.VITE_KAKAO_REDIRECT_URI || 'http://localhost:4000/auth/kakao/callback')}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  const handleGoogleError = () => {
    console.error('Google 로그인 실패');
    setError('Google 로그인에 실패했습니다. 다시 시도해주세요.');
  };

  const handleConsentSubmit = async () => {
    if (!termsAccepted || !privacyAccepted) {
      setError('필수 항목에 동의해주세요.');
      return;
    }

    try {
      setConsentSubmitting(true);
      
      const tempToken = localStorage.getItem('tempToken');
      const tempUser = localStorage.getItem('tempUser');
      
      if (!tempToken || !tempUser || !consentData) {
        setError('인증 정보가 없습니다. 다시 로그인해주세요.');
        return;
      }

      // GraphQL 뮤테이션으로 동의 제출
      const result = await submitConsent({
        variables: {
          input: {
            termsAccepted,
            privacyAccepted,
            newsletterOptIn,
            termsVersion: consentData.currentVersions.terms,
            privacyVersion: consentData.currentVersions.privacy,
            newsletterVersion: consentData.currentVersions.newsletter
          }
        }
      });

      if (result.data?.submitConsent) {
        // 동의 완료 후 정식 로그인
        const userData = JSON.parse(tempUser);
        login(userData, tempToken);
        
        // 임시 데이터 정리
        localStorage.removeItem('tempToken');
        localStorage.removeItem('tempUser');
        
        setShowConsentModal(false);
        
        // 리다이렉트
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect') || '/dashboard';
        window.location.href = redirectTo;
      }
    } catch (error: any) {
      console.error('동의 제출 오류:', error);
      setError(error.message || '동의 제출 중 오류가 발생했습니다.');
    } finally {
      setConsentSubmitting(false);
    }
  };

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

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] text-red-600 text-sm">
                {error}
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
                />
              </div>

              {/* Kakao Login */}
              <button
                onClick={handleKakaoLogin}
                className="w-full bg-[#FEE500] hover:bg-[#FCDD00] text-[#3C1E1E] font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C7.03 3 3 6.25 3 10.25c0 2.57 1.7 4.85 4.28 6.15L6.5 20.28c-.1.15-.02.34.15.39l4.85-2.32c.5.03 1 .03 1.5 0l4.85 2.32c.17-.05.25-.24.15-.39l-.78-3.88C20.3 15.1 22 12.82 22 10.25 22 6.25 17.97 3 12 3z"/>
                </svg>
                카카오로 시작하기
              </button>
            </div>
          </div>

          {/* Bottom Text */}
          <p className="text-center text-xs text-gray-400 mt-6">
            안전하고 빠른 소셜 로그인으로 시작하세요
          </p>
        </div>
      </div>

      {/* Consent Modal */}
      {showConsentModal && consentData && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[16px] w-full max-w-lg shadow-2xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">서비스 이용을 위한 동의</h3>
              <p className="text-sm text-gray-500 mt-1">정식 서비스 이용을 위해 필수 항목에 동의해주세요.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span className="text-sm text-gray-800">
                  [필수] 서비스 이용약관 동의 (v{consentData.currentVersions.terms})
                  <a href="/terms" className="ml-2 text-gray-500 underline" target="_blank" rel="noreferrer">보기</a>
                </span>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                />
                <span className="text-sm text-gray-800">
                  [필수] 개인정보 처리방침 동의 (v{consentData.currentVersions.privacy})
                  <a href="/privacy" className="ml-2 text-gray-500 underline" target="_blank" rel="noreferrer">보기</a>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={newsletterOptIn}
                  onChange={(e) => setNewsletterOptIn(e.target.checked)}
                />
                <span className="text-sm text-gray-800">
                  [선택] 뉴스레터 구독 (v{consentData.currentVersions.newsletter})
                  <span className="ml-2 text-gray-500 text-xs">매일 오전 6시 영어 표현 학습</span>
                </span>
              </label>
            </div>
            
            <div className="p-6 pt-2 flex items-center justify-between border-t border-gray-200">
              <button
                onClick={() => {
                  setShowConsentModal(false);
                  localStorage.removeItem('tempToken');
                  localStorage.removeItem('tempUser');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                취소
              </button>
              <button
                onClick={handleConsentSubmit}
                disabled={!termsAccepted || !privacyAccepted || consentSubmitting}
                className={`px-5 py-2 rounded-[10px] text-sm font-semibold transition-colors ${
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