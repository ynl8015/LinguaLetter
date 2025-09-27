// pages/NewsletterConfirm.tsx - 기존 파일 수정
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import Navbar from '../components/Navbar';
import LoadingAnimation from '../components/LoadingAnimation';

// GraphQL 뮤테이션 정의 (기존에 없다면 추가)
const CONFIRM_SUBSCRIPTION = gql`
  mutation ConfirmSubscription($token: String!) {
    confirmSubscription(token: $token) {
      success
      message
    }
  }
`;

export default function NewsletterConfirm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const [confirmSubscription] = useMutation(CONFIRM_SUBSCRIPTION);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('잘못된 확인 링크입니다.');
      return;
    }

    const handleConfirmSubscription = async () => {
      try {
        const result = await confirmSubscription({
          variables: { token }
        });

        if (result.data?.confirmSubscription?.success) {
          setStatus('success');
          setMessage(result.data.confirmSubscription.message || '구독이 성공적으로 확인되었습니다.');
        } else {
          setStatus('error');
          setMessage(result.data?.confirmSubscription?.message || '구독 확인 중 오류가 발생했습니다.');
        }
      } catch (error: any) {
        console.error('구독 확인 오류:', error);
        setStatus('error');
        setMessage(error.message || '네트워크 오류가 발생했습니다.');
      }
    };

    handleConfirmSubscription();
  }, [token, navigate, confirmSubscription]);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full text-center">
          
          {status === 'loading' && (
            <div className="space-y-6">
              <LoadingAnimation size="large" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">구독 확인 중...</h1>
                <p className="text-lg text-gray-600">잠시만 기다려주세요.</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">구독 확인 완료</h1>
                  <p className="text-xl text-gray-600 mb-6">{message}</p>
                  <p className="text-lg text-gray-500 mb-8">
                    매일 오전 6시에 새로운 LinguaLetter를 받아보세요
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGoToDashboard}
                  className="px-8 py-4 bg-black text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  대시보드로 이동
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                
                <button
                  onClick={handleGoToHome}
                  className="px-8 py-4 bg-gray-100 text-gray-800 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-colors"
                >
                  홈으로 이동
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">확인 실패</h1>
                  <p className="text-xl text-gray-600 mb-6">{message}</p>
                  <p className="text-lg text-gray-500">
                    문제가 지속되면 고객센터로 문의해주세요.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGoToHome}
                  className="px-8 py-4 bg-black text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors"
                >
                  홈으로 이동
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="px-8 py-4 bg-gray-100 text-gray-800 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}