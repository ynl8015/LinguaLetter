import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { deleteAccount } from '../services/authService';

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) return null;

  const handleDeleteAccount = async () => {
    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      alert('계정이 성공적으로 삭제되었습니다.');
      await logout();
      window.location.href = '/';
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">계정 설정</h3>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-[12px]">
          <h4 className="font-medium text-gray-800 mb-2">계정 정보</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-600">이메일:</span> {user.email}</p>
            <p><span className="text-gray-600">이름:</span> {user.name || '설정되지 않음'}</p>
            <p><span className="text-gray-600">가입일:</span> {new Date(user.createdAt).toLocaleDateString('ko-KR')}</p>
            <p><span className="text-gray-600">마지막 로그인:</span> {new Date(user.lastLogin).toLocaleDateString('ko-KR')}</p>
          </div>
        </div>

        <div className="border-t border-red-200 pt-4">
          <h4 className="font-medium text-red-800 mb-2">위험 구역</h4>
          <p className="text-sm text-gray-600 mb-4">
            계정을 삭제하면 모든 학습 기록, 피드백, 세션 데이터가 영구적으로 삭제됩니다.
          </p>
          
          {showDeleteConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-[12px] p-4">
              <p className="text-red-800 font-medium mb-3">정말로 계정을 삭제하시겠습니까?</p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-[8px] font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? '삭제 중...' : '예, 삭제합니다'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-[8px] font-medium hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-[12px] font-medium hover:bg-red-50 transition-colors"
            >
              계정 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
