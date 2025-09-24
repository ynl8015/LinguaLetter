import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth, isAdmin } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  GET_ALL_NEWS, 
  GENERATE_DAILY_NEWS, 
  CREATE_NEWS, 
  UPDATE_NEWS, 
  DELETE_NEWS,
  SEND_NEWSLETTER_TO_ALL
} from '../lib/apollo';

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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '날짜 정보 없음';
  }
};

interface NewsFormData {
  trendTopic: string;
  koreanArticle: string;
  englishTranslation: string;
  expression: string;
  literalTranslation: string;
  idiomaticTranslation: string;
  createdAt?: string;
  reason: string;
}

const initialFormData: NewsFormData = {
  trendTopic: '',
  koreanArticle: '',
  englishTranslation: '',
  expression: '',
  literalTranslation: '',
  idiomaticTranslation: '',
  createdAt: new Date().toISOString().slice(0, 16),
  reason: ''
};

export default function NewsAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState<NewsFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 관리자 권한 확인
  if (!isAdmin(user)) {
    navigate('/');
    return null;
  }

  const { data, loading, refetch } = useQuery(GET_ALL_NEWS, {
    variables: { limit: 100 },
    errorPolicy: 'all'
  });

  const [generateNews, { loading: generating }] = useMutation(GENERATE_DAILY_NEWS);
  const [createNews, { loading: creating }] = useMutation(CREATE_NEWS);
  const [updateNews, { loading: updating }] = useMutation(UPDATE_NEWS);
  const [deleteNews, { loading: deleting }] = useMutation(DELETE_NEWS);
  const [sendNewsletterToAll, { loading: sendingNewsletter }] = useMutation(SEND_NEWSLETTER_TO_ALL);

  const allNews: NewsItem[] = data?.allNews || [];

  const handleGenerateNews = async () => {
    try {
      const result = await generateNews();
      if (result.data?.generateDailyNews?.success) {
        refetch();
        alert('AI 뉴스가 생성되었습니다!');
      }
    } catch (error: any) {
      console.error('뉴스 생성 실패:', error);
      alert(`뉴스 생성 실패: ${error.message}`);
    }
  };

  const handleSendNewsletter = async (newsId: string, trendTopic: string) => {
    if (!confirm(`"${trendTopic}" 뉴스를 모든 구독자에게 발송하시겠습니까?`)) {
      return;
    }

    try {
      const result = await sendNewsletterToAll({
        variables: { newsId }
      });

      if (result.data?.sendNewsletterToAllSubscribers?.success) {
        const { message, count, total } = result.data.sendNewsletterToAllSubscribers;
        alert(`뉴스레터 발송 완료!\n${message}\n(성공: ${count}/${total})`);
      } else {
        alert(`뉴스레터 발송 실패: ${result.data?.sendNewsletterToAllSubscribers?.error}`);
      }
    } catch (error: any) {
      console.error('뉴스레터 발송 오류:', error);
      alert(`뉴스레터 발송 오류: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingNews) {
        // 수정
        await updateNews({
          variables: {
            id: editingNews.id,
            input: formData
          }
        });
        setEditingNews(null);
        alert('뉴스가 수정되었습니다!');
      } else {
        // 생성
        await createNews({
          variables: {
            input: formData
          }
        });
        setShowCreateForm(false);
        alert('뉴스가 생성되었습니다!');
      }
      
      setFormData(initialFormData);
      refetch();
    } catch (error: any) {
      console.error('뉴스 저장 실패:', error);
      alert(`저장 실패: ${error.message}`);
    }
  };

  const handleEdit = (news: NewsItem) => {
    let formattedDate = new Date().toISOString().slice(0, 16);

    try {
      if (news.createdAt) {
        const date = new Date(news.createdAt);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toISOString().slice(0, 16);
        }
      }
    } catch (error) {
      console.log('날짜 파싱 오류:', error);
    }

    setFormData({
      trendTopic: news.trendTopic,
      koreanArticle: news.koreanArticle,
      englishTranslation: news.englishTranslation,
      expression: news.expression,
      literalTranslation: news.literalTranslation,
      idiomaticTranslation: news.idiomaticTranslation,
      createdAt: formattedDate,
      reason: news.reason
    });
    setEditingNews(news);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      await deleteNews({ variables: { id } });
      refetch();
      alert('뉴스가 삭제되었습니다!');
    } catch (error: any) {
      console.error('삭제 실패:', error);
      alert(`삭제 실패: ${error.message}`);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const cancelEdit = () => {
    setEditingNews(null);
    setShowCreateForm(false);
    setFormData(initialFormData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="pt-28 px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          
          {/* 헤더 */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">뉴스 관리</h1>
                <p className="text-gray-600">모든 뉴스 콘텐츠를 관리하고 편집할 수 있습니다</p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleGenerateNews}
                  disabled={generating}
                  className="px-6 py-3 bg-gray-800 text-white rounded-[20px] font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-lg"
                >
                  {generating ? 'AI 생성 중...' : 'AI 뉴스 생성'}
                </button>
                
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-[20px] font-medium hover:border-gray-400 transition-colors"
                >
                  수동 작성
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-[20px] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{allNews.length}</div>
                    <div className="text-sm text-gray-500">총 뉴스</div>
                  </div>
                  <div className="w-px h-12 bg-gray-300"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {allNews.filter(news => 
                        new Date(news.createdAt).toDateString() === new Date().toDateString()
                      ).length}
                    </div>
                    <div className="text-sm text-gray-500">오늘 생성</div>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate('/news')}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  뉴스 페이지로 →
                </button>
              </div>
            </div>
          </div>

          {/* 뉴스 리스트 */}
          <div className="space-y-6">
            {allNews.map((news) => (
              <div key={news.id} className="bg-white border border-gray-200 rounded-[20px] p-8 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <span className="bg-gray-800 text-white px-4 py-2 rounded-[12px] text-sm font-medium">
                        {news.trendTopic}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {formatDate(news.createdAt)}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">한국어 기사</h3>
                        <p className="text-gray-700 leading-relaxed line-clamp-3">{news.koreanArticle}</p>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-blue-50 p-4 rounded-[12px] border border-blue-100">
                          <div className="font-medium text-gray-800 mb-1">핵심 표현</div>
                          <div className="text-gray-700">{news.expression}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-[12px] border border-red-100">
                          <div className="font-medium text-gray-800 mb-1">직역</div>
                          <div className="text-gray-700">{news.literalTranslation}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-[12px] border border-green-100">
                          <div className="font-medium text-gray-800 mb-1">의역</div>
                          <div className="text-gray-700">{news.idiomaticTranslation}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 ml-6">
                    <button
                      onClick={() => handleSendNewsletter(news.id, news.trendTopic)}
                      disabled={sendingNewsletter}
                      className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-[12px] transition-all"
                      title="구독자에게 뉴스레터 발송"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleEdit(news)}
                      className="p-3 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-[12px] transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(news.id)}
                      disabled={deleting}
                      className={`p-3 rounded-[12px] transition-all ${
                        deleteConfirm === news.id 
                          ? 'text-white bg-red-500 hover:bg-red-600' 
                          : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {deleteConfirm === news.id && (
                  <div className="bg-red-50 border border-red-200 rounded-[16px] p-4 text-center">
                    <p className="text-red-800 mb-3">정말 삭제하시겠습니까?</p>
                    <div className="space-x-3">
                      <button
                        onClick={() => handleDelete(news.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-[8px] hover:bg-red-600 transition-colors"
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-[8px] hover:bg-gray-300 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {allNews.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-6">아직 뉴스가 없습니다</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-gray-800 text-white rounded-[20px] font-medium hover:bg-gray-700 transition-colors"
                >
                  첫 번째 뉴스 만들기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 작성/편집 모달 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[20px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingNews ? '뉴스 수정' : '새 뉴스 작성'}
              </h2>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">주제</label>
                  <input
                    type="text"
                    value={formData.trendTopic}
                    onChange={(e) => setFormData({...formData, trendTopic: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[12px] focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">작성 날짜</label>
                  <input
                    type="datetime-local"
                    value={formData.createdAt}
                    onChange={(e) => setFormData({...formData, createdAt: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[12px] focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">한국어 기사</label>
                <textarea
                  value={formData.koreanArticle}
                  onChange={(e) => setFormData({...formData, koreanArticle: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-[12px] focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors h-32 resize-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">영어 번역</label>
                <textarea
                  value={formData.englishTranslation}
                  onChange={(e) => setFormData({...formData, englishTranslation: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-[12px] focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors h-32 resize-none"
                  required
                />
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">핵심 표현</label>
                  <input
                    type="text"
                    value={formData.expression}
                    onChange={(e) => setFormData({...formData, expression: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[12px] focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">직역</label>
                  <input
                    type="text"
                    value={formData.literalTranslation}
                    onChange={(e) => setFormData({...formData, literalTranslation: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[12px] focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">의역</label>
                  <input
                    type="text"
                    value={formData.idiomaticTranslation}
                    onChange={(e) => setFormData({...formData, idiomaticTranslation: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[12px] focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">해설</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-[12px] focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors h-24 resize-none"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-[20px] font-medium hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-8 py-3 bg-gray-800 text-white rounded-[20px] font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {creating || updating ? '저장 중...' : editingNews ? '수정' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}