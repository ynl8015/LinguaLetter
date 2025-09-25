// pages/NewsletterConfirm.tsx - 기존 파일 수정
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import Navbar from '../components/Navbar';

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
          
          // 3초 후 대시보드로 이동
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="pt-28 pb-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">구독 확인 중...</h1>
              <p className="text-gray-600">잠시만 기다려주세요.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">구독 확인 완료</h1>
              <p className="text-lg text-gray-600 mb-6">{message}</p>
              <p className="text-sm text-gray-500 mb-8">
                매일 오전 6시에 새로운 LinguaLetter를 받아보세요
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-[16px] p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  환영합니다
                </h3>
                <p className="text-gray-600 text-sm">
                  이제 한국어의 뉘앙스를 담은 영역 레슨을 받아보실 수 있습니다.
                </p>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-gray-800 text-white rounded-[16px] font-medium hover:bg-gray-700 transition-colors"
              >
                지금 대시보드로 이동
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">구독 확인 실패</h1>
              <p className="text-lg text-gray-600 mb-8">{message}</p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-[16px] p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">문제가 발생했습니다</h3>
                <div className="text-gray-600 text-sm text-left space-y-1">
                  <p>• 링크가 만료되었거나 이미 사용된 것 같습니다</p>
                  <p>• 다시 구독 신청을 해주세요</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/subscription')}
                  className="px-6 py-3 bg-gray-800 text-white rounded-[16px] font-medium hover:bg-gray-700 transition-colors"
                >
                  구독 페이지로 이동
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-[16px] font-medium hover:bg-gray-50 transition-colors"
                >
                  대시보드로 이동
                </button>
              </div>
            </>
          )}
          
        </div>
      </div>
    </div>
  );
}