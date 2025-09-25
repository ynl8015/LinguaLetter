// components/Navbar.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  showEndSessionButton?: boolean;
  onEndSession?: () => void;
}

export default function Navbar({ showEndSessionButton, onEndSession }: NavbarProps) {
  const { user, isAuthenticated, logout, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      
      // 로그아웃 후 홈페이지로 이동하며 성공 메시지 표시
      navigate('/?logged_out=true');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  const handleEndSession = () => {
    console.log('수업 마치기 버튼 클릭됨');
    if (onEndSession) {
      onEndSession();
      setIsMenuOpen(false);
    } else {
      console.log('onEndSession 함수가 없습니다');
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  // 사용자가 새 회원인지 판단 (가입한 지 24시간 이내)
  const isNewUser = user && user.createdAt ? 
    (new Date().getTime() - new Date(user.createdAt).getTime()) < 24 * 60 * 60 * 1000 : false;

  // 로딩 중일 때는 기본 네비게이션만 표시
  if (status === 'LOADING') {
    return (
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-lg border-b border-white/20 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src="https://res.cloudinary.com/dahbfym6q/image/upload/v1758003572/%E1%84%85%E1%85%B5%E1%86%BC%E1%84%80%E1%85%AE%E1%84%8B%E1%85%A1%E1%84%85%E1%85%A6%E1%84%90%E1%85%A5%E1%84%85%E1%85%A9%E1%84%80%E1%85%A9_lfvtie.png" 
                alt="LinguaLetter Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold text-gray-800">LinguaLetter</span>
            </Link>
          </div>
          <div className="w-6 h-6 animate-spin border-2 border-gray-300 border-t-gray-800 rounded-full"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-lg border-b border-white/20 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          {/* 로고 */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3" onClick={closeMenu}>
              <img 
                src="https://res.cloudinary.com/dahbfym6q/image/upload/v1758003572/%E1%84%85%E1%85%B5%E1%86%BC%E1%84%80%E1%85%AE%E1%84%8B%E1%85%A1%E1%84%85%E1%85%A6%E1%84%90%E1%85%A5%E1%84%85%E1%85%A9%E1%84%80%E1%85%A9_lfvtie.png" 
                alt="LinguaLetter Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold text-gray-800">LinguaLetter</span>
            </Link>
          </div>
          
          {/* 데스크톱 메뉴 */}
          <div className="hidden md:flex items-center space-x-6">
            {/* 수업 마치기 버튼 (데스크톱) */}
            {showEndSessionButton && (
              <button
                onClick={handleEndSession}
                className="px-4 py-2 bg-gray-800 text-white rounded-[20px] text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                수업 마치기
              </button>
            )}

            {/* 공통 메뉴 */}
            <Link 
              to="/news" 
              className={`font-medium transition-colors ${
                isActivePath('/news') 
                  ? 'text-gray-800 border-b-2 border-gray-800 pb-1' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              뉴스
            </Link>
            <Link 
              to="/teacher" 
              className={`font-medium transition-colors ${
                isActivePath('/teacher') 
                  ? 'text-gray-800 border-b-2 border-gray-800 pb-1' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              학습하기
            </Link>

            {isAuthenticated && user ? (
              // 로그인된 상태
              <>
                <Link 
                  to="/dashboard" 
                  className={`font-medium transition-colors ${
                    isActivePath('/dashboard') 
                      ? 'text-gray-800 border-b-2 border-gray-800 pb-1' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  마이페이지
                </Link>
                
                {/* 새 회원 표시와 로그아웃 버튼 */}
                <div className="flex items-center space-x-3">
                  {isNewUser && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      새 회원
                    </span>
                  )}
                  
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-gray-600 hover:text-gray-800 transition-colors font-medium disabled:opacity-50"
                  >
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                  </button>
                </div>
              </>
            ) : (
              // 로그인되지 않은 상태
              <Link 
                to="/login" 
                className="px-4 py-2 bg-gray-800 text-white rounded-[20px] text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                로그인 / 회원가입
              </Link>
            )}
          </div>

          {/* 모바일 햄버거 버튼 */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-600 hover:text-gray-800 transition-colors p-2"
              aria-label="메뉴 열기"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-lg">
            <div className="px-6 py-4 space-y-4">
              {/* 수업 마치기 버튼 (모바일) */}
              {showEndSessionButton && (
                <button
                  onClick={handleEndSession}
                  className="w-full py-3 px-4 bg-gray-800 text-white rounded-[16px] text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  수업 마치기
                </button>
              )}

              <Link 
                to="/news" 
                onClick={closeMenu}
                className={`block py-2 px-3 rounded-lg font-medium transition-colors ${
                  isActivePath('/news') 
                    ? 'bg-gray-100 text-gray-800' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                뉴스
              </Link>
              <Link 
                to="/teacher" 
                onClick={closeMenu}
                className={`block py-2 px-3 rounded-lg font-medium transition-colors ${
                  isActivePath('/teacher') 
                    ? 'bg-gray-100 text-gray-800' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                학습하기
              </Link>

              {isAuthenticated && user ? (
                <>
                  <Link 
                    to="/dashboard" 
                    onClick={closeMenu}
                    className={`block py-2 px-3 rounded-lg font-medium transition-colors ${
                      isActivePath('/dashboard') 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    마이페이지
                  </Link>

                  {/* 새 회원 표시 (모바일) */}
                  {isNewUser && (
                    <div className="flex items-center space-x-2 py-2 px-3">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        새 회원입니다! 환영합니다 🎉
                      </span>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full py-2 px-3 text-left text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                  </button>
                </>
              ) : (
                // 로그인되지 않은 상태 (모바일)
                <Link 
                  to="/login" 
                  onClick={closeMenu}
                  className="w-full py-3 px-4 bg-gray-800 text-white rounded-[16px] text-sm font-medium hover:bg-gray-700 transition-colors text-center block"
                >
                  로그인 / 회원가입
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden"
          style={{ top: '70px' }}
          onClick={closeMenu}
        />
      )}
    </nav>
  );
}