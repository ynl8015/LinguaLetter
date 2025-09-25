import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  GET_MY_SUBSCRIPTION_STATUS, 
  SUBSCRIBE_NEWSLETTER, 
  UNSUBSCRIBE_NEWSLETTER 
} from '../lib/apollo';

interface SubscriptionStatus {
  isSubscribed: boolean;
  subscribedAt?: string;
  confirmedAt?: string;
}

export default function SubscriptionManager() {
  const { user } = useAuth();
  const [isChanging, setIsChanging] = useState(false);

  const { data, loading, refetch } = useQuery(GET_MY_SUBSCRIPTION_STATUS, {
    skip: !user,
    errorPolicy: 'all'
  });

  const [subscribeNewsletter] = useMutation(SUBSCRIBE_NEWSLETTER);
  const [unsubscribeNewsletter] = useMutation(UNSUBSCRIBE_NEWSLETTER);

  const subscriptionStatus: SubscriptionStatus | null = data?.mySubscriptionStatus || null;

  if (!user) {
    return (
      <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">뉴스레터 구독</h3>
        <p className="text-gray-600 mb-4">
          로그인하시면 뉴스레터 구독 상태를 확인하고 관리할 수 있습니다.
        </p>
        <a
          href="/login"
          className="inline-block px-4 py-2 bg-gray-800 text-white rounded-[12px] font-medium hover:bg-gray-700 transition-colors"
        >
          로그인하기
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  const handleSubscribe = async () => {
    if (!user.email) return;
    
    setIsChanging(true);
    try {
      const result = await subscribeNewsletter({
        variables: { email: user.email }
      });

      if (result.data?.subscribeNewsletter?.success) {
        alert('구독 확인 이메일이 발송되었습니다. 이메일을 확인해주세요.');
        refetch();
      } else {
        const error = result.data?.subscribeNewsletter?.error;
        if (error === "Already subscribed") {
          alert('이미 구독하신 이메일입니다.');
        } else {
          alert('구독 신청 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('구독 오류:', error);
      alert('구독 신청 중 오류가 발생했습니다.');
    } finally {
      setIsChanging(false);
    }
  };


  const handleUnsubscribe = async () => {
  if (!user.email || !confirm('정말 구독을 해지하시겠습니까?')) return;
  
  setIsChanging(true);
  try {
    const result = await unsubscribeNewsletter({
      variables: { email: user.email }
    });

    if (result.data?.unsubscribeNewsletter?.success) {
      alert('구독이 해지되었습니다.');
      refetch();
    } else {
      alert(result.data?.unsubscribeNewsletter?.error || '구독 해지 중 오류가 발생했습니다.');
    }
  } catch (error) {
    console.error('구독 해지 오류:', error);
    alert('구독 해지 중 오류가 발생했습니다.');
  } finally {
    setIsChanging(false);
  }
};

  const formatDate = (dateString?: string) => {
    if (!dateString) return '정보 없음';
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '정보 없음';
    }
  };

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">뉴스레터 구독 관리</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-[12px]">
          <div>
            <p className="font-medium text-gray-800">{user.email}</p>
            <p className="text-sm text-gray-600">
              상태: {subscriptionStatus?.isSubscribed ? (
                <span className="text-green-600 font-medium">구독 중</span>
              ) : (
                <span className="text-gray-500">구독하지 않음</span>
              )}
            </p>
            {subscriptionStatus?.isSubscribed && (
              <p className="text-xs text-gray-500">
                구독일: {formatDate(subscriptionStatus.subscribedAt)}
              </p>
            )}
          </div>
          
          <div>
            {subscriptionStatus?.isSubscribed ? (
              <button
                onClick={handleUnsubscribe}
                disabled={isChanging}
                className="px-4 py-2 bg-red-600 text-white rounded-[12px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isChanging ? '처리 중...' : '구독 해지'}
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={isChanging}
                className="px-4 py-2 bg-gray-800 text-white rounded-[12px] font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {isChanging ? '처리 중...' : '구독하기'}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p className="mb-2">📧 매일 오전 6시에 영어 표현 학습 뉴스레터가 발송됩니다.</p>
          <p>🔄 언제든지 구독하거나 해지할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
