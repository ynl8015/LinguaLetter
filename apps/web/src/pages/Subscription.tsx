import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import Navbar from '../components/Navbar';
import { SUBSCRIBE_NEWSLETTER } from '../lib/apollo';
import { MdEmail, MdSchedule, MdNewspaper, MdChat, MdCheck, MdArrowForward } from 'react-icons/md';

export default function Subscription() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const [subscribeNewsletter, { loading: subscribing }] = useMutation(SUBSCRIBE_NEWSLETTER);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;

    try {
      const result = await subscribeNewsletter({
        variables: { email }
      });

      if (result.data?.subscribeNewsletter?.success) {
        setIsSubscribed(true);
        setEmail("");
      } else {
        const errorMessage = result.data?.subscribeNewsletter?.error;
        if (errorMessage === "Already subscribed") {
          alert('이미 구독하신 이메일입니다.');
        } else {
          alert('구독 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
      }
    } catch (error: any) {
      console.error('구독 오류:', error);
      alert('구독 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              LinguaLetter 구독
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              매일 오전 6시, 한국어의 진짜 맛을 담은 의역 레슨이 당신의 메일함으로 배달됩니다.
            </p>
            
            <div className="flex items-center mt-4 text-green-600">
              <MdCheck className="w-5 h-5 mr-2" />
              <span className="font-medium">완전 무료 · 언제든 해지 가능</span>
            </div>
          </div>

          {/* 구독 폼 */}
          <div className="mb-16">
            {isSubscribed ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <MdCheck className="w-6 h-6 text-green-600 mr-3" />
                  <h3 className="text-xl font-semibold text-green-800">이메일을 확인해주세요</h3>
                </div>
                <p className="text-green-700">
                  받은편지함에서 <span className="font-semibold">구독 확인</span> 메일을 열고 버튼을 눌러주세요. 확인이 완료되면 매일 오전 6시에 레슨을 보내드릴게요.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일 주소
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    required
                    disabled={subscribing}
                  />
                </div>
                <button
                  type="submit"
                  disabled={subscribing || !email.trim()}
                  className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {subscribing ? '구독 중...' : '무료 구독하기'}
                </button>
              </form>
            )}
          </div>

          {/* 서비스 정보 */}
          <div className="space-y-8 mb-16">
            <div className="flex items-start space-x-4">
              <MdSchedule className="w-6 h-6 text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">매일 오전 6시 발송</h3>
                <p className="text-gray-600">정확한 시간에 배달되는 의역 레슨으로 하루를 시작하세요.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <MdNewspaper className="w-6 h-6 text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">실시간 한국 뉴스 기반</h3>
                <p className="text-gray-600">12:30에 업데이트되는 한국 뉴스로 생생한 학습을 경험하세요.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <MdChat className="w-6 h-6 text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">AI와 실전 대화</h3>
                <p className="text-gray-600">Emma, Steve와 함께 배운 내용을 실제 대화로 연습할 수 있습니다.</p>
              </div>
            </div>
          </div>

          {/* 학습 과정 */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">어떻게 학습하나요?</h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">메일 확인</h3>
                  <p className="text-gray-600">매일 오전 6시에 도착하는 의역 레슨을 확인합니다.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">의역 학습</h3>
                  <p className="text-gray-600">직역과 의역의 차이를 통해 자연스러운 영어 표현을 습득합니다.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">실전 대화</h3>
                  <p className="text-gray-600">AI 선생님과 배운 주제로 실제 대화를 연습합니다.</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">자주 묻는 질문</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">정말 무료인가요?</h3>
                <p className="text-gray-600">네, 완전 무료입니다. 숨겨진 비용이나 유료 업그레이드는 없습니다.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">언제든지 구독 해지할 수 있나요?</h3>
                <p className="text-gray-600">물론입니다. 매 메일 하단의 '구독 해지' 링크를 클릭하면 즉시 해지됩니다.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">메일이 오지 않으면 어떻게 하나요?</h3>
                <p className="text-gray-600">스팸함을 확인해보시고, 문제가 지속되면 다시 구독 신청해주세요.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          {!isSubscribed && (
            <div className="text-center border-t border-gray-200 pt-8">
              <p className="text-gray-600 mb-4">아직 망설이고 계신가요?</p>
              <Link 
                to="/teacher" 
                className="inline-block bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                먼저 AI 선생님과 대화해보기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}