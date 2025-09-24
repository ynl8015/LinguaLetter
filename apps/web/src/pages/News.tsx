import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth, isAdmin } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { GET_LATEST_NEWS, GET_NEWS_HISTORY, GENERATE_DAILY_NEWS } from '../lib/apollo';

interface NewsItem {
  id: string;
  trendTopic: string;
  koreanArticle: string;
  englishTranslation: string;
  expression: string;
  literalTranslation: string;
  idiomaticTranslation: string;
  reason: string;
  createdAt: string;
}

// 안전한 날짜 파싱 함수
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '날짜 정보 없음';
  
  try {
    // ISO 문자열을 Date 객체로 변환
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '날짜 정보 없음';
    }
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return '날짜 정보 없음';
  }
};

export default function News() {
  const { user } = useAuth();
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [viewMode, setViewMode] = useState<'latest' | 'history'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const ITEMS_PER_PAGE = 6;

  const [generateNews, { loading: generating }] = useMutation(GENERATE_DAILY_NEWS);

  // GraphQL 쿼리들
  const { data: latestNewsData, loading: latestLoading, refetch: refetchLatest } = useQuery(GET_LATEST_NEWS, {
    skip: viewMode !== 'latest',
    errorPolicy: 'all'
  });

  const { data: historyData, loading: historyLoading, refetch: refetchHistory } = useQuery(GET_NEWS_HISTORY, {
    variables: { limit: 50 },
    skip: viewMode !== 'history',
    errorPolicy: 'all'
  });

  const latestNews: NewsItem | null = latestNewsData?.latestNews || null;
  const newsHistory: NewsItem[] = historyData?.newsHistory || [];

  const loading = viewMode === 'latest' ? latestLoading : historyLoading;

  const totalPages = Math.ceil(newsHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = newsHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleGenerateNews = async () => {
    try {
      const result = await generateNews();
      if (result.data?.generateDailyNews?.success) {
        refetchLatest();
        refetchHistory();
        alert('새로운 뉴스가 생성되었습니다!');
      }
    } catch (error) {
      console.error('뉴스 생성 실패:', error);
      alert('뉴스 생성에 실패했습니다.');
    }
  };

  const renderNewsContent = (newsItem: NewsItem) => (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-gray-800 text-white px-4 py-2 rounded-[12px] text-sm font-medium">
            {newsItem.trendTopic}
          </span>
          <span className="text-gray-500 text-sm">
            {formatDate(newsItem.createdAt)}
          </span>
        </div>
      </div>

      {/* 한국어 기사 */}
      <div className="mb-8">
        <p className="text-gray-800 text-lg leading-relaxed">
          {newsItem.koreanArticle}
        </p>
      </div>

      {/* 영어 번역 */}
      <div className="mb-8 bg-gray-50 p-6 rounded-[20px]">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">영어 번역</h3>
        <p className="text-gray-700 leading-relaxed">
          {newsItem.englishTranslation}
        </p>
      </div>

      {/* 의역 포인트 */}
      <div className="bg-blue-50 p-6 rounded-[20px]">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">의역 포인트</h3>
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-[12px]">
            <span className="font-semibold text-gray-800">한국어적 표현:</span>
            <span className="ml-2 text-gray-700">{newsItem.expression}</span>
          </div>
          <div className="bg-white p-4 rounded-[12px]">
            <span className="font-semibold text-red-600">영어 직역 (X):</span>
            <span className="ml-2 text-gray-700">{newsItem.literalTranslation}</span>
          </div>
          <div className="bg-white p-4 rounded-[12px]">
            <span className="font-semibold text-green-600">영어 의역 (O):</span>
            <span className="ml-2 text-gray-700">{newsItem.idiomaticTranslation}</span>
          </div>
          <div className="bg-white p-4 rounded-[12px]">
            <span className="font-semibold text-gray-800">해설:</span>
            <span className="ml-2 text-gray-700">{newsItem.reason}</span>
          </div>
        </div>
      </div>

      {/* 학습하러 가기 버튼 */}
      <div className="mt-12 text-center">
        <Link 
          to="/teacher"
          className="inline-block px-8 py-4 bg-gray-800 text-white rounded-[20px] font-semibold text-lg hover:bg-gray-700 transition-colors"
        >
          이 주제로 대화하러 가기
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">뉴스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-28 px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          
          {/* 관리자 패널 */}
          {isAdmin(user) && (
            <div className="mb-12">
              <div 
                className="bg-red-50 border border-red-200 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setShowAdminPanel(!showAdminPanel)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <h3 className="text-lg font-semibold text-red-800">Admin Panel</h3>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-red-600 transition-transform ${showAdminPanel ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {showAdminPanel && (
                  <div className="mt-6 flex gap-4 flex-wrap">
                    <button 
                      onClick={handleGenerateNews}
                      disabled={generating}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {generating ? 'Generating...' : 'Generate AI News'}
                    </button>
                    <Link 
                      to="/admin/news"
                      className="px-6 py-3 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-all shadow-lg"
                    >
                      Manage All News
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">뉴스</h1>
            <p className="text-lg text-gray-600 mb-8">한국 뉴스로 배우는 자연스러운 의역</p>
            
            {/* View Mode Toggle */}
            <div className="inline-flex items-center bg-gray-100 rounded-[20px] p-1">
              <button 
                onClick={() => {
                  setViewMode('latest');
                  setCurrentPage(1);
                }}
                className={`px-6 py-2 rounded-[16px] font-medium transition-all ${
                  viewMode === 'latest' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                오늘의 뉴스
              </button>
              <button 
                onClick={() => {
                  setViewMode('history');
                  setCurrentPage(1);
                }}
                className={`px-6 py-2 rounded-[16px] font-medium transition-all ${
                  viewMode === 'history' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                이전 뉴스
              </button>
            </div>
          </div>

          {viewMode === 'latest' ? (
            // 최신 뉴스 - 바로 전체 내용 표시
            latestNews ? (
              renderNewsContent(latestNews)
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">아직 준비된 뉴스가 없습니다.</p>
                <p className="text-gray-400 text-sm mt-2">매일 새벽 12:30에 새로운 뉴스가 업데이트됩니다.</p>
              </div>
            )
          ) : (
            // 이전 뉴스 - 리스트 표시, 페이지네이션 + 모달
            newsHistory.length > 0 ? (
              <>
                <div className="grid gap-6">
                  {paginatedHistory.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white border-2 border-gray-200 rounded-[20px] p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => setSelectedNews(item)}
                    >
                      <div className="mb-4">
                        <span className="inline-block bg-gray-800 text-white px-3 py-1 rounded-[12px] text-sm font-medium mb-3">
                          {item.trendTopic}
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        {formatDate(item.createdAt)}
                      </div>
                      <p className="text-gray-600 line-clamp-3">{item.koreanArticle}</p>
                      <div className="mt-4 text-sm text-gray-500">
                        핵심 표현: <span className="font-medium text-gray-700">{item.expression}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <nav className="inline-flex items-center gap-2" role="navigation" aria-label="페이지네이션">
                      {currentPage > 1 && (
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                          aria-label="이전 페이지"
                        >
                          {"<"}
                        </button>
                      )}

                      {(() => {
                        const first = currentPage < totalPages ? currentPage : Math.max(1, totalPages - 1);
                        const pages = totalPages === 1 ? [1] : [first, Math.min(totalPages, first + 1)];
                        return pages.map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                              page === currentPage
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            aria-current={page === currentPage ? 'page' : undefined}
                            aria-label={`페이지 ${page}`}
                          >
                            {page}
                          </button>
                        ));
                      })()}

                      {currentPage < totalPages && (
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                          aria-label="다음 페이지"
                        >
                          {">"}
                        </button>
                      )}
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">저장된 뉴스가 없습니다.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* 히스토리 */}
      {selectedNews && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-[20px] w-full max-w-4xl h-[90vh] overflow-hidden shadow-2xl border border-white/20">
            <div className="h-full flex flex-col">
              {/* Modal Header */}
              <div className="flex justify-between items-start p-8 border-b border-gray-200 flex-shrink-0">
                <div>
                  <span className="inline-block bg-gray-800 text-white px-4 py-2 rounded-[12px] text-sm font-medium mb-3">
                    {selectedNews.trendTopic}
                  </span>
                  <div className="text-gray-500 text-sm">
                    {formatDate(selectedNews.createdAt)}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* 모달 영역 */}
              <div 
                className="flex-1 p-8 overflow-y-auto modal-content"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <style>{`
                  .modal-content::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <div className="space-y-6">
                  {/* 한국어 기사 */}
                  <div>
                    <p className="text-gray-800 text-lg leading-relaxed">
                      {selectedNews.koreanArticle}
                    </p>
                  </div>
                  
                  {/* 영어 번역 */}
                  <div className="bg-gray-50 p-6 rounded-[20px]">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">영어 번역</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedNews.englishTranslation}
                    </p>
                  </div>
                  
                  {/* 의역 포인트 */}
                  <div className="bg-blue-50 p-6 rounded-[20px]">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">의역 포인트</h3>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-[12px]">
                        <span className="font-semibold text-gray-800">한국어적 표현:</span>
                        <div className="text-gray-700 mt-1">{selectedNews.expression}</div>
                      </div>
                      <div className="bg-white p-4 rounded-[12px]">
                        <span className="font-semibold text-red-600">영어 직역 (X):</span>
                        <div className="text-gray-700 mt-1">{selectedNews.literalTranslation}</div>
                      </div>
                      <div className="bg-white p-4 rounded-[12px]">
                        <span className="font-semibold text-green-600">영어 의역 (O):</span>
                        <div className="text-gray-700 mt-1">{selectedNews.idiomaticTranslation}</div>
                      </div>
                      <div className="bg-white p-4 rounded-[12px]">
                        <span className="font-semibold text-gray-800">해설:</span>
                        <div className="text-gray-700 mt-1 text-sm">{selectedNews.reason}</div>
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