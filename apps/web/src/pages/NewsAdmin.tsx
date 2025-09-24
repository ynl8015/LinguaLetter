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
  DELETE_NEWS 
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

interface NewsFormData {
  trendTopic: string;
  koreanArticle: string;
  englishTranslation: string;
  expression: string;
  literalTranslation: string;
  idiomaticTranslation: string;
  reason: string;
}

const initialFormData: NewsFormData = {
  trendTopic: '',
  koreanArticle: '',
  englishTranslation: '',
  expression: '',
  literalTranslation: '',
  idiomaticTranslation: '',
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
    setFormData({
      trendTopic: news.trendTopic,
      koreanArticle: news.koreanArticle,
      englishTranslation: news.englishTranslation,
      expression: news.expression,
      literalTranslation: news.literalTranslation,
      idiomaticTranslation: news.idiomaticTranslation,
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
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-sky-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="pt-24 px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          
          {/* 헤더 */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-black mb-2">뉴스 관리</h1>
                <p className="text-gray-600">모든 뉴스 콘텐츠를 관리하고 편집할 수 있습니다</p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleGenerateNews}
                  disabled={generating}
                  className="px-6 py-3 bg-sky-500 text-white rounded-xl font-medium hover:bg-sky-600 disabled:opacity-50 transition-all shadow-lg"
                >
                  {generating ? 'AI 생성 중...' : 'AI 뉴스 생성'}
                </button>
                
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg"
                >
                  수동 작성
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{allNews.length}</div>
                    <div className="text-sm text-gray-500">총 뉴스</div>
                  </div>
                  <div className="w-px h-12 bg-gray-300"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-sky-500">
                      {allNews.filter(news => 
                        new Date(news.createdAt).toDateString() === new Date().toDateString()
                      ).length}
                    </div>
                    <div className="text-sm text-gray-500">오늘 생성</div>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate('/news')}
                  className="px-4 py-2 text-gray-600 hover:text-black transition-colors"
                >
                  뉴스 페이지로 →
                </button>
              </div>
            </div>
          </div>

          {/* 뉴스 리스트 */}
          <div className="space-y-6">
            {allNews.map((news) => (
              <div key={news.id} className="bg-white border-2 border-gray-100 rounded-2xl p-8 hover:border-sky-200 transition-colors">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium">
                        {news.trendTopic}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {new Date(news.createdAt).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">한국어 기사</h3>
                        <p className="text-gray-700 leading-relaxed line-clamp-3">{news.koreanArticle}</p>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-sky-50 p-4 rounded-xl">
                          <div className="font-medium text-black mb-1">핵심 표현</div>
                          <div className="text-gray-700">{news.expression}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl">
                          <div className="font-medium text-black mb-1">직역</div>
                          <div className="text-gray-700">{news.literalTranslation}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl">
                          <div className="font-medium text-black mb-1">의역</div>
                          <div className="text-gray-700">{news.idiomaticTranslation}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 ml-6">
                    <button
                      onClick={() => handleEdit(news)}
                      className="p-3 text-gray-500 hover:text-sky-500 hover:bg-sky-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(news.id)}
                      disabled={deleting}
                      className={`p-3 rounded-xl transition-all ${
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
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-red-800 mb-3">정말 삭제하시겠습니까?</p>
                    <div className="space-x-3">
                      <button
                        onClick={() => handleDelete(news.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
                <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <p className="text-xl text-gray-500 mb-4">뉴스가 없습니다</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800"
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
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-black">
                {editingNews ? '뉴스 수정' : '새 뉴스 작성'}
              </h2>
              <button
                onClick={cancelEdit}
                className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-gray-100 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-sm font-medium text-black mb-3">주제</label>
                <input
                  type="text"
                  value={formData.trendTopic}
                  onChange={(e) => setFormData({...formData, trendTopic: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-3">한국어 기사</label>
                <textarea
                  value={formData.koreanArticle}
                  onChange={(e) => setFormData({...formData, koreanArticle: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors h-32 resize-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-3">영어 번역</label>
                <textarea
                  value={formData.englishTranslation}
                  onChange={(e) => setFormData({...formData, englishTranslation: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors h-32 resize-none"
                  required
                />
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-3">핵심 표현</label>
                  <input
                    type="text"
                    value={formData.expression}
                    onChange={(e) => setFormData({...formData, expression: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-3">직역</label>
                  <input
                    type="text"
                    value={formData.literalTranslation}
                    onChange={(e) => setFormData({...formData, literalTranslation: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-3">의역</label>
                  <input
                    type="text"
                    value={formData.idiomaticTranslation}
                    onChange={(e) => setFormData({...formData, idiomaticTranslation: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-3">해설</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-sky-500 focus:outline-none transition-colors h-24 resize-none"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-3 text-gray-600 hover:text-black transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-8 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
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