import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  showEndSessionButton?: boolean;
  onEndSession?: () => void;
}

export default function Navbar({ showEndSessionButton, onEndSession }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

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
        
        <div className="flex items-center space-x-6">
          {/* 수업 마치기 버튼 (맨 앞에 배치) */}
          {showEndSessionButton && (
            <button
              onClick={() => {
                console.log('수업 마치기 버튼 클릭됨');
                if (onEndSession) {
                  onEndSession();
                } else {
                  console.log('onEndSession 함수가 없습니다');
                }
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-[20px] text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              수업 마치기
            </button>
          )}

          {/* 공통 메뉴 */}
          <Link to="/news" className="text-gray-600 hover:text-gray-800 transition-colors font-medium">
            뉴스
          </Link>
          <Link to="/teacher" className="text-gray-600 hover:text-gray-800 transition-colors font-medium">
            학습하기
          </Link>

          {isAuthenticated ? (
            // 로그인된 상태
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-800 transition-colors font-medium">
                마이페이지
              </Link>
              
              <button 
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                로그아웃
              </button>
            </>
          ) : (
            // 로그인되지 않은 상태
            <Link to="/login" className="text-gray-600 hover:text-gray-800 transition-colors font-medium">
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}