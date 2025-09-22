import React from 'react';
import Navbar from '../components/Navbar';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-28 px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">개인정보 처리방침</h1>
          <div className="prose max-w-none text-gray-700 leading-relaxed">
            <p className="mb-4">LinguaLetter는 이용자의 개인정보를 안전하게 보호하기 위해 최선을 다합니다.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">1. 수집 항목</h2>
            <p className="mb-4">이메일, 이름, 프로필 이미지 등 서비스 제공에 필요한 최소한의 정보만 수집합니다.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">2. 이용 목적</h2>
            <p className="mb-4">서비스 제공, 고객 지원, 서비스 개선을 위해 개인정보를 이용합니다.</p>
            <h2 className="text-xl font-semibold mt-8 mb-2">3. 보관 기간</h2>
            <p className="mb-4">관련 법령 또는 이용자의 요청에 따라 보관 및 파기합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}