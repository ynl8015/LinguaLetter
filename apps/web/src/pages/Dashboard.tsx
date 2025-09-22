import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import OverallFeedback from '../components/FeedbackChart';
import { GET_MY_STATS, GET_MY_SESSIONS, GET_MY_FEEDBACKS } from '../lib/apollo';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface UserStats {
  id: number;
  userId: string;
  totalSessions: number;
  totalMessages: number;
  streakDays: number;
  lastStudyDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  id: string;
  userId: string;
  teacher: string;
  topic: string;
  summary: string;
  feedback: string[];
  createdAt: string;
}

interface FeedbackData {
  id: number;
  sessionId: string;
  userId: string;
  overallScore: number;
  overallGrade: string;
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  comprehensionScore: number;
  naturalnessScore: number;
  strengths: string[];
  improvements: string[];
  corrections: Array<{
    original: string;
    corrected: string;
    reason: string;
  }>;
  recommendedFocus: string;
  nextTopics: string[];
  createdAt: string;
}

interface OverallStats {
  averageScores: {
    grammar: number;
    vocabulary: number;
    fluency: number;
    comprehension: number;
    naturalness: number;
    overall: number;
  };
  totalSessions: number;
  commonStrengths: string[];
  commonImprovements: string[];
  overallGrade: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(null);

  // GraphQL 쿼리들
  const { data: statsData, loading: statsLoading } = useQuery(GET_MY_STATS, {
    skip: !user,
    errorPolicy: 'all'
  });

  const { data: sessionsData, loading: sessionsLoading } = useQuery(GET_MY_SESSIONS, {
    variables: { limit: 10 },
    skip: !user,
    errorPolicy: 'all'
  });

  const { data: feedbacksData, loading: feedbacksLoading } = useQuery(GET_MY_FEEDBACKS, {
    variables: { limit: 20 },
    skip: !user,
    errorPolicy: 'all'
  });

  const userStats: UserStats | null = statsData?.myStats || null;
  const recentSessions: Session[] = sessionsData?.mySessions || [];
  const allFeedbacks: FeedbackData[] = feedbacksData?.myFeedbacks || [];

  // 피드백 데이터 집계
  const aggregateFeedbackData = (feedbackList: FeedbackData[]): OverallStats => {
    const totalFeedbacks = feedbackList.length;
    
    if (totalFeedbacks === 0) {
      return {
        averageScores: {
          grammar: 0,
          vocabulary: 0,
          fluency: 0,
          comprehension: 0,
          naturalness: 0,
          overall: 0
        },
        totalSessions: 0,
        commonStrengths: [],
        commonImprovements: [],
        overallGrade: 'NV'
      };
    }

    // 평균 점수 계산
    const avgGrammar = feedbackList.reduce((sum, f) => sum + f.grammarScore, 0) / totalFeedbacks;
    const avgVocabulary = feedbackList.reduce((sum, f) => sum + f.vocabularyScore, 0) / totalFeedbacks;
    const avgFluency = feedbackList.reduce((sum, f) => sum + f.fluencyScore, 0) / totalFeedbacks;
    const avgComprehension = feedbackList.reduce((sum, f) => sum + f.comprehensionScore, 0) / totalFeedbacks;
    const avgNaturalness = feedbackList.reduce((sum, f) => sum + f.naturalnessScore, 0) / totalFeedbacks;
    const avgOverall = feedbackList.reduce((sum, f) => sum + f.overallScore, 0) / totalFeedbacks;

    // 가장 자주 나오는 강점과 개선점 추출
    const allStrengths: string[] = [];
    const allImprovements: string[] = [];

    feedbackList.forEach(feedback => {
      if (Array.isArray(feedback.strengths)) {
        allStrengths.push(...feedback.strengths);
      }
      if (Array.isArray(feedback.improvements)) {
        allImprovements.push(...feedback.improvements);
      }
    });

    // 빈도수로 정렬하여 상위 3개씩 선택
    const strengthCounts = allStrengths.reduce((acc, strength) => {
      acc[strength] = (acc[strength] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const improvementCounts = allImprovements.reduce((acc, improvement) => {
      acc[improvement] = (acc[improvement] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonStrengths = Object.entries(strengthCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([strength]) => strength);

    const commonImprovements = Object.entries(improvementCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([improvement]) => improvement);

    // 전체 등급 결정
    let overallGrade = 'NV';
    if (avgOverall >= 8.5) overallGrade = 'IH';
    else if (avgOverall >= 7.0) overallGrade = 'IM';
    else if (avgOverall >= 5.5) overallGrade = 'IL';
    else if (avgOverall >= 4.0) overallGrade = 'NH';
    else if (avgOverall >= 2.5) overallGrade = 'NM';
    else overallGrade = 'NL';

    return {
      averageScores: {
        grammar: avgGrammar,
        vocabulary: avgVocabulary,
        fluency: avgFluency,
        comprehension: avgComprehension,
        naturalness: avgNaturalness,
        overall: avgOverall
      },
      totalSessions: totalFeedbacks,
      commonStrengths,
      commonImprovements,
      overallGrade
    };
  };

  const overallStats = allFeedbacks.length > 0 ? aggregateFeedbackData(allFeedbacks) : null;

  const loading = statsLoading || sessionsLoading || feedbacksLoading;

  if (loading) {
    return (
      <div className="h-screen overflow-hidden bg-white">
        <Navbar />
        <div className="pt-28 h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen overflow-hidden bg-white">
        <Navbar />
        <div className="pt-28 h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
            <a href="/login" className="bg-gray-800 text-white px-6 py-3 rounded-[20px] hover:bg-gray-700">
              로그인하기
            </a>
          </div>
        </div>
      </div>
    );
  }

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="h-screen overflow-auto bg-white">
      <Navbar />
      
      <div className="pt-28 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-2">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {getInitial(user.name || '')}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{user.name}님의 학습 현황</h1>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
          </div>

          {/* 통계 카드 */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2">총 세션</h3>
                <p className="text-3xl font-bold text-gray-800">{userStats.totalSessions}</p>
              </div>
              <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2">총 메시지</h3>
                <p className="text-3xl font-bold text-gray-800">{userStats.totalMessages}</p>
              </div>
              <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2">연속 학습</h3>
                <p className="text-3xl font-bold text-gray-800">{userStats.streakDays}일</p>
              </div>
              <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2">마지막 학습</h3>
                <p className="text-lg font-bold text-gray-800">
                  {userStats.lastStudyDate 
                    ? new Date(userStats.lastStudyDate).toLocaleDateString('ko-KR') 
                    : '없음'}
                </p>
              </div>
            </div>
          )}

          {/* 종합 피드백 */}
          <div className="mb-8">
            <OverallFeedback overallStats={overallStats} />
          </div>

          {/* 최근 학습 기록 */}
          <div className="bg-white rounded-[20px] p-8 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">최근 학습 기록</h2>
            
            {recentSessions.length > 0 ? (
              <div className="space-y-6">
                {recentSessions.map((session) => {
                  const sessionFeedback = allFeedbacks.find(f => f.sessionId === session.id);
                  return (
                    <div 
                      key={session.id} 
                      className={`border-b border-gray-100 pb-6 last:border-b-0 ${
                        sessionFeedback ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => sessionFeedback && setSelectedFeedback(sessionFeedback)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="bg-gray-800 text-white px-3 py-1.5 rounded-[12px] text-sm font-medium">
                              {session.teacher}
                            </span>
                            <span className="text-gray-700 font-medium">{session.topic}</span>
                            {sessionFeedback && (
                              <span className="px-3 py-1 rounded-[8px] text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200">
                                {sessionFeedback.overallGrade} {sessionFeedback.overallScore.toFixed(1)}점
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed mb-2">{session.summary}</p>
                          {sessionFeedback && (
                            <div className="text-xs text-gray-500">
                              클릭하여 상세 피드백 보기
                            </div>
                          )}
                        </div>
                        <span className="text-gray-400 text-xs ml-4">
                          {new Date(session.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-6">아직 학습 기록이 없습니다</p>
                <a 
                  href="/teacher"
                  className="inline-block px-6 py-3 bg-gray-800 text-white rounded-[20px] font-medium hover:bg-gray-700 transition-colors"
                >
                  첫 학습 시작하기
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 피드백 상세 모달 */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl">
            <div className="h-full flex flex-col">
              {/* 모달 헤더 */}
              <div className="flex justify-between items-start p-8 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">상세 피드백</h2>
                  <p className="text-gray-600 mt-1">
                    {new Date(selectedFeedback.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedFeedback(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  ×
                </button>
              </div>
              
              {/* 모달 콘텐츠 */}
              <div 
                className="flex-1 p-8 overflow-y-auto"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <style>{`
                  .feedback-modal::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <div className="feedback-modal space-y-8">
                  {/* 종합 점수 */}
                  <div className="text-center bg-gray-50 rounded-[20px] p-8">
                    <div className="text-5xl font-bold text-gray-800 mb-3">{selectedFeedback.overallScore.toFixed(1)}</div>
                    <div className="text-xl font-semibold mb-3 px-4 py-2 rounded-[12px] inline-block bg-sky-100 text-sky-700 border border-sky-200">
                      {selectedFeedback.overallGrade}
                    </div>
                  </div>

                  {/* 레이더 차트 */}
                  <div className="bg-white rounded-[20px] p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">영역별 상세 분석</h3>
                    <div className="h-80 w-full mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={[
                          { subject: '문법', score: selectedFeedback.grammarScore },
                          { subject: '어휘', score: selectedFeedback.vocabularyScore },
                          { subject: '유창성', score: selectedFeedback.fluencyScore },
                          { subject: '이해력', score: selectedFeedback.comprehensionScore },
                          { subject: '자연스러움', score: selectedFeedback.naturalnessScore }
                        ]}>
                          <PolarGrid 
                            gridType="polygon"
                            radialLines={true}
                            stroke="#e5e7eb"
                          />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fontSize: 12, fill: '#4b5563' }}
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
                            stroke="#0ea5e9"
                            fill="#0ea5e9"
                            fillOpacity={0.1}
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 2 }}
                            isAnimationActive={false}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* 점수 표시 */}
                    <div className="grid grid-cols-5 gap-4 text-center">
                      {[
                        { name: '문법', score: selectedFeedback.grammarScore },
                        { name: '어휘', score: selectedFeedback.vocabularyScore },
                        { name: '유창성', score: selectedFeedback.fluencyScore },
                        { name: '이해력', score: selectedFeedback.comprehensionScore },
                        { name: '자연스러움', score: selectedFeedback.naturalnessScore }
                      ].map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-[12px] p-3">
                          <span className="text-sm text-gray-600 block mb-1">{item.name}</span>
                          <span className="text-xl font-bold text-gray-800">{item.score.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 강점과 개선점 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 잘한 점 */}
                    <div className="bg-white rounded-[20px] p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">잘한 점</h3>
                      <div className="space-y-3">
                        {selectedFeedback.strengths && selectedFeedback.strengths.length > 0 ? (
                          selectedFeedback.strengths.map((strength, index) => (
                            <div key={index} className="flex items-start bg-gray-50 rounded-[12px] p-3">
                              <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                                {index + 1}
                              </div>
                              <p className="text-gray-700 text-sm">{strength}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">분석 중입니다...</p>
                        )}
                      </div>
                    </div>

                    {/* 개선점 */}
                    <div className="bg-white rounded-[20px] p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">개선점</h3>
                      <div className="space-y-3">
                        {selectedFeedback.improvements && selectedFeedback.improvements.length > 0 ? (
                          selectedFeedback.improvements.map((improvement, index) => (
                            <div key={index} className="flex items-start bg-gray-50 rounded-[12px] p-3">
                              <div className="w-6 h-6 bg-sky-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                                {index + 1}
                              </div>
                              <p className="text-gray-700 text-sm">{improvement}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">분석 중입니다...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 교정 사항 */}
                  {selectedFeedback.corrections && selectedFeedback.corrections.length > 0 && (
                    <div className="bg-white rounded-[20px] p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">교정 사항</h3>
                      <div className="space-y-4">
                        {selectedFeedback.corrections.map((correction, index) => (
                          <div key={index} className="bg-gray-50 rounded-[16px] p-4 border-l-4 border-sky-400">
                            <div className="space-y-3">
                              <div className="flex items-start space-x-2">
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-medium">원문</span>
                                <span className="text-gray-600 line-through text-sm">{correction.original}</span>
                              </div>
                              <div className="flex items-start space-x-2">
                                <span className="text-xs bg-sky-100 text-sky-600 px-2 py-1 rounded font-medium">교정</span>
                                <span className="text-gray-800 font-medium text-sm">{correction.corrected}</span>
                              </div>
                              <div className="bg-white p-3 rounded-[12px] border border-gray-200">
                                <span className="text-gray-700 text-sm">{correction.reason}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 추천 학습 방향 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[20px] p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">추천 학습 포커스</h3>
                      <div className="bg-blue-50 rounded-[12px] p-4">
                        <p className="text-gray-700 font-medium">{selectedFeedback.recommendedFocus}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[20px] p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">다음 추천 주제</h3>
                      <div className="space-y-2">
                        {selectedFeedback.nextTopics && selectedFeedback.nextTopics.length > 0 ? (
                          selectedFeedback.nextTopics.map((topic, index) => (
                            <div key={index} className="bg-gray-50 rounded-[8px] px-3 py-2">
                              <span className="text-gray-700 text-sm">{topic}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">추천 주제를 분석 중입니다...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}