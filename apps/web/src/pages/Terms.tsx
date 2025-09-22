import React from 'react';
import Navbar from '../components/Navbar';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-28 px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">서비스 이용약관</h1>
          <div className="prose max-w-none text-gray-700 leading-relaxed">
            <p className="mb-4">본 약관은 LinguaLetter 서비스 이용에 관한 기본적인 사항을 규정합니다.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">1. 목적</h2>
            <p className="mb-4">이 약관은 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">2. 서비스 내용</h2>
            <p className="mb-4">LinguaLetter는 한국 뉴스를 바탕으로 한 영어 표현 학습 콘텐츠를 제공합니다.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">3. 기타</h2>
            <p className="mb-4">자세한 내용은 추후 고지될 수 있으며, 변경 시 공지합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}