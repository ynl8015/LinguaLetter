import React from 'react';
import Navbar from '../components/Navbar';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 sm:p-12 rounded-lg shadow-sm">
            <h1 className="text-4xl font-bold text-gray-900 mb-8 border-b pb-4">
              서비스 이용약관
            </h1>
            <article className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
              <p>LinguaLetter 서비스에 오신 것을 환영합니다. 본 약관은 LinguaLetter(이하 "회사")가 제공하는 모든 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

              <h2 className="font-semibold mt-10 mb-4">제1조 (용어의 정의)</h2>
              <ul>
                <li><strong>서비스:</strong> 회사가 제공하는 한국 뉴스 기반 영어 학습 콘텐츠 및 이와 관련된 모든 부대 서비스를 의미합니다.</li>
                <li><strong>회원:</strong> 본 약관에 동의하고 소셜 로그인 등 회사가 정한 절차에 따라 가입하여 서비스를 이용하는 고객을 의미합니다.</li>
                <li><strong>콘텐츠:</strong> 회사가 제작하여 뉴스레터 및 웹사이트를 통해 제공하는 한국어/영어 뉴스, 표현 분석, 해설 등 모든 정보와 자료를 의미합니다.</li>
                <li><strong>AI 튜터:</strong> 회원의 학습을 돕기 위해 웹사이트 내에서 대화 서비스를 제공하는 인공지능 채팅 파트너(Emma, Steve 등)를 의미합니다.</li>
              </ul>

              <h2 className="font-semibold mt-10 mb-4">제2조 (서비스의 내용)</h2>
              <ol>
                <li>회사는 회원에게 매일 지정된 시간에 이메일을 통해 뉴스레터 콘텐츠를 발송합니다.</li>
                <li>뉴스레터 콘텐츠는 한국어 뉴스, 영어 번역본, 핵심 한국어 표현에 대한 직역 및 의역, 문화적 맥락에 대한 해설 등을 포함합니다.</li>
                <li>회원은 웹사이트에 로그인하여 뉴스레터 주제에 대해 AI 튜터와 10분간 영어로 대화하는 '데일리 미션'을 수행할 수 있습니다.</li>
                <li>대화 종료 후, 회사는 회원의 발화 내용에 기반한 학습 피드백을 대시보드 형태로 제공합니다.</li>
              </ol>

              <h2 className="font-semibold mt-10 mb-4">제3조 (회원 가입 및 정보)</h2>
              <p>서비스 이용을 원하는 고객은 Google 등 회사가 지원하는 소셜 계정을 통해 회원으로 가입할 수 있습니다. 회사는 회원의 원활한 서비스 이용을 위해 이메일, 이름, 프로필 이미지 등의 정보를 수집할 수 있습니다.</p>

              <h2 className="font-semibold mt-10 mb-4">제4조 (콘텐츠 저작권)</h2>
              <p>회사가 제공하는 모든 콘텐츠의 저작권은 회사에 귀속됩니다. 회원은 회사의 사전 동의 없이 콘텐츠를 복제, 배포, 전송, 출판하거나 상업적인 목적으로 사용할 수 없습니다.</p>

              <h2 className="font-semibold mt-10 mb-4">제5조 (약관의 변경)</h2>
              <p>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다. 약관이 개정될 경우, 회사는 적용일자 및 개정사유를 명시하여 시행일 7일 전부터 서비스 웹사이트를 통해 공지합니다.</p>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}

