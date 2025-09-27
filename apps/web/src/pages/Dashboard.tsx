import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import OverallFeedback from '../components/FeedbackChart';
import { 
  GET_ME, 
  GET_MY_STATS, 
  GET_MY_SESSIONS, 
  GET_MY_FEEDBACKS,
  GET_MY_SUBSCRIPTION_STATUS,
  UNSUBSCRIBE_NEWSLETTER,
  SUBSCRIBE_NEWSLETTER,
  DELETE_ACCOUNT
} from '../lib/apollo';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { 
  MdWarning,
  MdCancel,
  MdPerson,
  MdDelete,
  MdFeedback
} from 'react-icons/md';
import emmaImage from '../assets/emma.png';
import steveImage from '../assets/steve.png';
import LoadingAnimation from '../components/LoadingAnimation';

interface FeedbackData {
  id: string;
  sessionId: string;
  overallScore: number;
  overallGrade: string;
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  comprehensionScore: number;
  naturalnessScore: number;
  strengths: string[];
  improvements: string[];
  corrections: any[];
  recommendedFocus: string;
  nextTopics: string[];
  createdAt: string;
}

interface SessionData {
  id: string;
  teacher: string;
  topic: string;
  summary?: string;
  feedback: string[];
  createdAt: string;
}

interface UserStats {
  totalSessions: number;
  totalMessages: number;
  streakDays: number;
  lastStudyDate?: string;
}

export default function Dashboard() {
  const { user, logout, status } = useAuth();
  const apolloClient = useApolloClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);

  // GraphQL Queries
  const { data: statsData, loading: statsLoading } = useQuery(GET_MY_STATS, {
    skip: !user,
    errorPolicy: 'all'
  });

  const { data: sessionsData, loading: sessionsLoading } = useQuery(GET_MY_SESSIONS, {
    variables: { limit: 20 },
    skip: !user,
    errorPolicy: 'all'
  });

  const { data: feedbacksData, loading: feedbacksLoading } = useQuery(GET_MY_FEEDBACKS, {
    variables: { limit: 20 },
    skip: !user,
    errorPolicy: 'all'
  });

  const { data: subscriptionData, loading: subscriptionLoading, refetch: refetchSubscription } = useQuery(GET_MY_SUBSCRIPTION_STATUS, {
    skip: !user,
    errorPolicy: 'all'
  });

  const [subscribeNewsletter] = useMutation(SUBSCRIBE_NEWSLETTER);
  const [unsubscribeNewsletter] = useMutation(UNSUBSCRIBE_NEWSLETTER);
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);

  const stats: UserStats | null = statsData?.myStats || null;
  const sessions: SessionData[] = sessionsData?.mySessions || [];
  const feedbacks: FeedbackData[] = feedbacksData?.myFeedbacks || [];
  const subscriptionStatus = subscriptionData?.mySubscriptionStatus || null;

  // Calculate overall feedback stats for spider chart
  const overallStats = feedbacks.length > 0 ? {
    averageScores: {
      grammar: feedbacks.reduce((sum, f) => sum + f.grammarScore, 0) / feedbacks.length,
      vocabulary: feedbacks.reduce((sum, f) => sum + f.vocabularyScore, 0) / feedbacks.length,
      fluency: feedbacks.reduce((sum, f) => sum + f.fluencyScore, 0) / feedbacks.length,
      comprehension: feedbacks.reduce((sum, f) => sum + f.comprehensionScore, 0) / feedbacks.length,
      naturalness: feedbacks.reduce((sum, f) => sum + f.naturalnessScore, 0) / feedbacks.length,
      overall: feedbacks.reduce((sum, f) => sum + f.overallScore, 0) / feedbacks.length,
    },
    totalSessions: feedbacks.length,
    commonStrengths: Array.from(new Set(feedbacks.flatMap(f => f.strengths))).slice(0, 5),
    commonImprovements: Array.from(new Set(feedbacks.flatMap(f => f.improvements))).slice(0, 5),
    overallGrade: feedbacks[0]?.overallGrade || 'N/A'
  } : null;

  // Prepare spider chart data
  const spiderData = overallStats ? [
    { subject: '문법', score: overallStats.averageScores.grammar, fullMark: 10 },
    { subject: '어휘', score: overallStats.averageScores.vocabulary, fullMark: 10 },
    { subject: '유창성', score: overallStats.averageScores.fluency, fullMark: 10 },
    { subject: '이해력', score: overallStats.averageScores.comprehension, fullMark: 10 },
    { subject: '자연스러움', score: overallStats.averageScores.naturalness, fullMark: 10 },
  ] : [];

  // Prepare progress chart data
  const progressData = feedbacks.slice(-10).map((feedback, index) => ({
    session: `${index + 1}`,
    score: feedback.overallScore,
    date: new Date(feedback.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }));

const handleSubscriptionToggle = async () => {
  console.log('🖱️ handleSubscriptionToggle 호출됨');
  console.log('👤 user?.email:', user?.email);
  console.log('📊 subscriptionStatus:', subscriptionStatus);
  
  if (!user?.email) {
    console.log('❌ user.email이 없어서 함수 종료');
    return;
  }
  
  try {
    if (subscriptionStatus?.isSubscribed) {
      console.log('🔴 구독 해지 시도');
      const result = await unsubscribeNewsletter({
        variables: { email: user.email }
      });
      
      console.log('📨 unsubscribe 결과:', result);
      
      if (result.data?.unsubscribeNewsletter?.success) {
        alert('구독이 해지되었습니다.');
        console.log('✅ 구독 해지 성공, refetch 호출');
      } else {
        console.log('❌ 구독 해지 실패:', result.data?.unsubscribeNewsletter);
        alert(result.data?.unsubscribeNewsletter?.error || '구독 해지 실패');
      }
    } else {
      console.log('🔵 구독 신청 시도');
      const result = await subscribeNewsletter({
        variables: { email: user.email }
      });
      
      console.log('📨 subscribe 결과:', result);
      
      if (result.data?.subscribeNewsletter?.success) {
        alert('구독 확인 이메일이 발송되었습니다.');
        console.log('✅ 구독 신청 성공, refetch 호출');
      } else {
        console.log('❌ 구독 신청 실패:', result.data?.subscribeNewsletter);
        alert(result.data?.subscribeNewsletter?.error || '구독 신청 실패');
      }
    }
    
    // refetch 함수 호출
    console.log('🔄 refetchSubscription 호출');
    refetchSubscription();
    
  } catch (error) {
    console.error('💥 Subscription error:', error);
    alert('처리 중 오류가 발생했습니다.');
  }
};

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      
      if (result.data?.deleteAccount?.success) {
        alert(result.data.deleteAccount.message || '계정이 삭제되었습니다.');
        // 강제로 페이지를 완전히 새로고침하여 모든 상태 초기화
        window.location.href = '/login?deleted=true';
      } else {
        alert(result.data?.deleteAccount?.message || '계정 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      alert('계정 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 로딩 중일 때 (카카오 로그인 완료 후에는 로딩 숨김)
  if (status === 'LOADING') {
    const isKakaoLoginComplete = localStorage.getItem('kakaoAuthStatus') === 'SUCCESS';
    
    if (isKakaoLoginComplete) {
      // 카카오 로그인 완료 후에는 로딩을 보이지 않고 바로 렌더링
      localStorage.removeItem('kakaoAuthStatus');
    } else {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Navbar />
          <LoadingAnimation size="large" message="로딩 중..." />
        </div>
      );
    }
  }

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">로그인이 필요합니다</h3>
          <a href="/login" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            로그인하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* User Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
              {user.picture ? (
                <img src={user.picture} alt={user.name || user.email} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <MdPerson className="w-6 h-6 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-gray-900">{user.name || '사용자'}</h1>
                  {subscriptionStatus?.isSubscribed ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      구독중
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      미구독
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: '대시보드' },
              { id: 'learning', name: '히스토리' },
              { id: 'settings', name: '설정' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Message */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                안녕하세요 {user.name || '사용자'}님!
              </h2>
              <p className="text-gray-600">
                LinguaLetter와 함께하는 영어 학습 여정을 확인해보세요.
              </p>
            </div>

            {/* Main Learning History Card with Spider Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">학습 성과 분석</h2>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {overallStats?.overallGrade || 'N/A'}
                  </span>
                </div>
              </div>

              {overallStats ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Spider Chart */}
                  <div className="flex flex-col items-center">
                    <div className="w-full h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={spiderData}>
                          <PolarGrid 
                            gridType="polygon"
                            radialLines={true}
                            stroke="#e5e7eb"
                          />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fontSize: 12, fill: '#374151' }}
                            className="text-sm font-medium"
                          />
                          <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 10]} 
                            tick={false}
                            axisLine={false}
                          />
                          <Radar
                            name="점수"
                            dataKey="score"
                            stroke="#000000"
                            fill="#000000"
                            fillOpacity={0.1}
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#000000', stroke: '#ffffff', strokeWidth: 2 }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Score Grid */}
                    <div className="grid grid-cols-5 gap-4 mt-4 w-full">
                      {spiderData.map((item, index) => (
                        <div key={index} className="text-center">
                          <div className="bg-gray-50 rounded-lg p-3 border">
                            <p className="text-xs text-gray-600 mb-1">{item.subject}</p>
                            <p className="text-lg font-bold text-gray-900">{item.score.toFixed(1)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress Chart */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 진행 상황</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={progressData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                          <YAxis domain={[0, 10]} stroke="#6b7280" fontSize={12} />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#000000" 
                            strokeWidth={2}
                            dot={{ fill: '#000000', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#000000' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <h3 className="text-xl font-medium text-gray-900 mb-3">학습 데이터가 없습니다</h3>
                  <p className="text-gray-500 mb-8">AI 선생님과의 첫 대화를 시작해보세요</p>
                  <a 
                    href="/teacher" 
                    className="inline-block px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    대화 시작하기
                  </a>
                </div>
              )}
            </div>

            {/* Recent Feedback Summary */}
            {feedbacks.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">최근 피드백 요약</h3>
                  <span className="text-sm text-gray-500">{feedbacks.length}개의 피드백</span>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Latest Feedback */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">최신 피드백</h4>
                    <div className="space-y-3">
                      {feedbacks.slice(0, 3).map((feedback, index) => (
                        <div key={feedback.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{feedback.overallScore.toFixed(1)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                                {feedback.overallGrade}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                            {feedback.strengths.length > 0 && (
                              <p className="text-sm text-gray-600 truncate">
                                강점: {feedback.strengths[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Common Patterns */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">학습 패턴</h4>
                    <div className="space-y-3">
                      {overallStats?.commonStrengths.slice(0, 3).map((strength, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                          <span className="text-sm text-gray-700 font-medium">강점:</span>
                          <span className="text-sm text-gray-700 ml-2">{strength}</span>
                        </div>
                      ))}
                      {overallStats?.commonImprovements.slice(0, 2).map((improvement, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <span className="text-sm text-gray-700 font-medium">개선:</span>
                          <span className="text-sm text-gray-700 ml-2">{improvement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'learning' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                총 {sessions.length}개의 세션
              </div>
            </div>

            {sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div 
                    key={session.id} 
                    onClick={() => setSelectedSession(session)}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <img 
                            src={session.teacher === 'emma' ? emmaImage : steveImage}
                            alt={session.teacher === 'emma' ? 'Emma 선생님' : 'Steve 선생님'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{session.topic}</h3>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              {session.teacher === 'emma' ? 'Emma' : 'Steve'}
                            </span>
                          </div>
                          
                          {session.summary && (
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{session.summary}</p>
                          )}
                          
                          {session.feedback.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <MdFeedback className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">피드백 {session.feedback.length}개</span>
                              </div>
                              <div className="space-y-1">
                                {session.feedback.slice(0, 2).map((feedback, index) => (
                                  <p key={index} className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 line-clamp-1">
                                    {feedback}
                                  </p>
                                ))}
                                {session.feedback.length > 2 && (
                                  <p className="text-xs text-gray-500 pl-2">
                                    +{session.feedback.length - 2}개 더 보기
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="text-sm text-gray-500 mb-1">
                          <span>{formatDate(session.createdAt)}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(session.createdAt).toLocaleTimeString('ko-KR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load More Button (if needed in the future) */}
                {sessions.length >= 10 && (
                  <div className="text-center pt-4">
                    <button className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      더 보기
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-20 text-center">
                <h3 className="text-xl font-medium text-gray-900 mb-3">대화 기록이 없습니다</h3>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
                  AI 선생님과 첫 대화를 나누고<br />학습 여정을 시작해보세요
                </p>
                <a 
                  href="/teacher" 
                  className="inline-block px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  대화 시작하기
                </a>
              </div>
            )}
          </div>
        )}


        {activeTab === 'settings' && (
          <div className="space-y-8">
            
            <div className="space-y-6">

              {/* Newsletter Subscription */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">뉴스레터 구독</h3>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-500">상태:</span>
                        {subscriptionStatus?.isSubscribed ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            구독 중
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            미구독
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {subscriptionStatus?.isSubscribed ? (
                      <button
                        onClick={handleSubscriptionToggle}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        구독 해지
                      </button>
                    ) : (
                      <a
                        href="/subscription"
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 transition-colors inline-block"
                      >
                        구독하기
                      </a>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                    <p>매일 오전 6시에 영어 표현 학습 뉴스레터가 발송됩니다.</p>
                  </div>
                </div>
              </div>

              {/* Account Deletion */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">계정 관리</h3>
                <div className="bg-white border border-red-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">계정 삭제</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img 
                      src={selectedSession.teacher === 'emma' ? emmaImage : steveImage}
                      alt={selectedSession.teacher === 'emma' ? 'Emma 선생님' : 'Steve 선생님'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedSession.topic}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedSession.teacher === 'emma' ? 'Emma 선생님' : 'Steve 선생님'} • {formatDate(selectedSession.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MdCancel className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* 해당 세션의 피드백 분석 표시 */}
              {(() => {
                const sessionFeedback = feedbacks.find(f => f.sessionId === selectedSession.id);
                if (sessionFeedback) {
                  const sessionStats = {
                    averageScores: {
                      grammar: sessionFeedback.grammarScore,
                      vocabulary: sessionFeedback.vocabularyScore,
                      fluency: sessionFeedback.fluencyScore,
                      comprehension: sessionFeedback.comprehensionScore,
                      naturalness: sessionFeedback.naturalnessScore,
                      overall: sessionFeedback.overallScore,
                    },
                    totalSessions: 1,
                    commonStrengths: sessionFeedback.strengths,
                    commonImprovements: sessionFeedback.improvements,
                    overallGrade: sessionFeedback.overallGrade
                  };
                  
                  return (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">세션 피드백 분석</h4>
                      <OverallFeedback overallStats={sessionStats} />
                    </div>
                  );
                }
                return null;
              })()}
              

              {selectedSession.feedback.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">대화 피드백 ({selectedSession.feedback.length}개)</h4>
                  <div className="space-y-3">
                    {selectedSession.feedback.map((feedback, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          </div>
                          <p className="text-gray-700 text-sm">{feedback}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-xl font-medium text-gray-900 mb-4">계정 삭제</h3>
              
              <div className="text-gray-600 mb-8">
                <p className="mb-4">계정과 모든 데이터가 영구적으로 삭제됩니다.</p>
                <div className="bg-red-50 rounded-lg p-4 text-left text-sm">
                  <p className="font-medium text-gray-700 mb-2">삭제되는 데이터:</p>
                  <div className="text-gray-600 space-y-1">
                    <div>학습 세션 및 대화 기록</div>
                    <div>피드백 및 성과 데이터</div>
                    <div>계정 정보 및 설정</div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}