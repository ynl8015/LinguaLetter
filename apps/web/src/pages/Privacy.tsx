import React from 'react';
import Navbar from '../components/Navbar';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 sm:p-12 rounded-lg shadow-sm">
            <h1 className="text-4xl font-bold text-gray-900 mb-8 border-b pb-4">
              개인정보 처리방침
            </h1>
            <article className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
              <p>LinguaLetter(이하 "회사")는 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관련 법령상의 개인정보보호 규정을 준수하며, 회원의 개인정보 보호에 최선을 다하고 있습니다.</p>

              <h2 className="font-semibold mt-10 mb-4">제1조 (개인정보의 수집 및 이용 목적)</h2>
              <p>회사는 다음의 목적을 위해 최소한의 개인정보를 수집하고 이용합니다.</p>
              <ul>
                <li><strong>회원 식별 및 관리:</strong> 소셜 로그인(Google 등)을 통해 제공받는 이메일, 이름, 프로필 이미지를 회원 식별 및 서비스 이용 기록 관리에 사용합니다.</li>
                <li><strong>서비스 제공:</strong> 뉴스레터 발송, AI 튜터와의 대화 기능 제공 등 핵심 서비스 제공을 위해 사용합니다.</li>
                <li><strong>학습 피드백 생성:</strong> AI 튜터와의 대화 기록(텍스트)은 회원의 학습 성과 분석 및 맞춤형 피드백을 생성하는 데 사용됩니다.</li>
                <li><strong>서비스 개선 및 연구:</strong> 비식별화된 대화 데이터는 AI 모델의 성능 향상 및 새로운 학습 기능 개발을 위한 연구 목적으로 활용될 수 있습니다.</li>
              </ul>

              <h2 className="font-semibold mt-10 mb-4">제2조 (수집하는 개인정보의 항목)</h2>
              <ul>
                <li><strong>필수 항목:</strong> 이메일 주소, 이름, 프로필 이미지 (소셜 로그인 시 제공)</li>
                <li><strong>서비스 이용 중 자동 생성:</strong> AI 튜터와의 대화 기록, 서비스 이용 로그, 접속 IP 정보, 쿠키</li>
              </ul>

              <h2 className="font-semibold mt-10 mb-4">제3조 (개인정보의 처리 및 보유 기간)</h2>
              <p>회사는 원칙적으로 회원이 회원 자격을 유지하는 동안 개인정보를 보유 및 이용하며, 회원이 회원 탈퇴를 요청하거나 개인정보의 수집 및 이용에 대한 동의를 철회하는 경우 지체 없이 파기합니다. 단, 관련 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 해당 법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.</p>

              <h2 className="font-semibold mt-10 mb-4">제4조 (개인정보의 안전성 확보 조치)</h2>
              <p>회사는 회원의 개인정보를 안전하게 관리하기 위해 기술적, 관리적 보호조치를 취하고 있으며, 개인정보보호에 관한 정기적인 교육을 실시하고 있습니다.</p>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}

