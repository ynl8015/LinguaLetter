// pages/NewsletterUnsubscribe.tsx - 새로 생성
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import Navbar from '../components/Navbar';

// GraphQL 뮤테이션 정의
const UNSUBSCRIBE_BY_TOKEN = gql`
  mutation UnsubscribeByToken($token: String!) {
    unsubscribeByToken(token: $token) {
      success
      message
    }
  }
`;

export default function NewsletterUnsubscribe() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  const [unsubscribeByToken] = useMutation(UNSUBSCRIBE_BY_TOKEN);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('잘못된 구독 해지 링크입니다.');
      return;
    }

    const handleUnsubscribe = async () => {
      try {
        const result = await unsubscribeByToken({
          variables: { token }
        });

        if (result.data?.unsubscribeByToken?.success) {
          setStatus('success');
          setMessage(result.data.unsubscribeByToken.message || '구독이 성공적으로 해지되었습니다.');
        } else {
          setStatus('error');
          setMessage(result.data?.unsubscribeByToken?.message || '구독 해지 중 오류가 발생했습니다.');
        }
      } catch (error: any) {
        console.error('구독 해지 오류:', error);
        setStatus('error');
        setMessage(error.message || '네트워크 오류가 발생했습니다.');
      }
    };

    handleUnsubscribe();
  }, [token, unsubscribeByToken]);

  useEffect(() => {
    // 5초 카운트다운 후 홈페이지로 이동
    if (status !== 'loading') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="pt-28 pb-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">구독 해지 중...</h1>
              <p className="text-gray-600">잠시만 기다려주세요.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">구독 해지 완료</h1>
              <p className="text-lg text-gray-600 mb-6">{message}</p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-[16px] p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  안녕히 가세요
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  더 이상 뉴스레터를 받지 않습니다.<br/>
                  언제든 다시 구독하실 수 있습니다.
                </p>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                {countdown}초 후 홈페이지로 자동 이동합니다
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gray-800 text-white rounded-[16px] font-medium hover:bg-gray-700 transition-colors"
                >
                  홈페이지로 이동
                </button>
                <button
                  onClick={() => navigate('/subscription')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-[16px] font-medium hover:bg-gray-50 transition-colors"
                >
                  다시 구독하기
                </button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">구독 해지 실패</h1>
              <p className="text-lg text-gray-600 mb-6">{message}</p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-[16px] p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">확인이 필요합니다</h3>
                <div className="text-gray-600 text-sm text-left space-y-1">
                  <p>• 링크가 만료되었을 수 있습니다</p>
                  <p>• 이미 해지된 구독일 수 있습니다</p>
                  <p>• 링크가 손상되었을 수 있습니다</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                {countdown}초 후 홈페이지로 자동 이동합니다
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gray-800 text-white rounded-[16px] font-medium hover:bg-gray-700 transition-colors"
                >
                  홈페이지로 이동
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