import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import laptopImage from "../assets/Laptop.png";
import emmaImage from "../assets/emma.png";
import steveImage from "../assets/steve.png";

export default function LinguaLetterLanding() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: "LinguaLetter",
      subtitle: "한국어의 뉘앙스를 영어로",
      description: `뉴스 속 문장을 '의역의 시선'으로 풀어 한 문장씩 익히고,
저녁엔 10분 대화로 바로 써봅니다.
부담 없이, 매일 한 걸음.`,
      imageType: "laptop",
    },
    {
      id: 2,
      title: "메일함에 쏙, 하루 한 컷",
      subtitle: "앱 없이 바로 열고, 보관도 간편",
      description: `아침마다 받은편지함에 쏙.
읽고 넘기면 오늘 표현 끝.
따로 열 앱도, 번거로운 알림도 없습니다.`,
      imageType: "newsletter",
    },
    {
      id: 3,
      title: "AI 튜터와 10분 실전",
      subtitle: "부담 없이 끝내는 데일리 영어 공부",
      description: `오늘 배운 표현으로 가볍게 10분.
두 명의 특색이 있는 선생님과, 
OPIc 스타일 피드백으로 시험을 위한 준비까지.
*채팅을 통한 구어능력의 향상과 관련된 여러 논문들이 존재`,
      imageType: "teachers",
    },
  ];

  // 자동 슬라이드 기능
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 20000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const renderImage = (imageType: string) => {
    switch (imageType) {
      case "laptop":
        return (
          <div className="relative flex justify-center">
            <img 
              src={laptopImage} 
              alt="LinguaLetter Laptop" 
              className="w-full max-w-80 lg:max-w-96 h-auto object-contain drop-shadow-2xl"
            />
          </div>
        );
      
      case "newsletter":
        return (
          <div className="w-full max-w-72 lg:max-w-80 mx-auto bg-white border-2 border-gray-100 rounded-[20px] shadow-lg overflow-hidden">
            {/* 헤더 */}
            <div className="h-10 lg:h-12 bg-gray-800 flex items-center px-3 lg:px-4">
              <img 
                src="https://res.cloudinary.com/dahbfym6q/image/upload/v1758003572/%E1%84%85%E1%85%B5%E1%86%BC%E1%84%80%E1%85%AE%E1%84%8B%E1%85%A1%E1%84%85%E1%85%A6%E1%84%90%E1%85%A5%E1%84%85%E1%85%A9%E1%84%80%E1%85%A9_lfvtie.png" 
                alt="LinguaLetter Logo" 
                className="w-5 h-5 lg:w-6 lg:h-6 object-contain mr-2 lg:mr-3"
              />
              <span className="text-white font-semibold text-xs lg:text-sm">Daily Expression</span>
            </div>
            
            {/* 콘텐츠 */}
            <div className="p-4 lg:p-6 space-y-3 lg:space-y-4">
              <div className="space-y-1.5 lg:space-y-2">
                <div className="h-2.5 lg:h-3 bg-gray-800 rounded-full w-full"></div>
                <div className="h-2.5 lg:h-3 bg-gray-300 rounded-full w-4/5"></div>
                <div className="h-2.5 lg:h-3 bg-gray-300 rounded-full w-3/5"></div>
              </div>
              
              <div className="space-y-1.5 lg:space-y-2 pt-3 lg:pt-4 border-t border-gray-100">
                <div className="h-1.5 lg:h-2 bg-gray-200 rounded-full w-full"></div>
                <div className="h-1.5 lg:h-2 bg-gray-200 rounded-full w-5/6"></div>
                <div className="h-1.5 lg:h-2 bg-gray-200 rounded-full w-4/5"></div>
                <div className="h-1.5 lg:h-2 bg-gray-200 rounded-full w-3/4"></div>
              </div>
              
              <div className="space-y-1.5 lg:space-y-2 pt-3 lg:pt-4">
                <div className="h-1.5 lg:h-2 bg-gray-200 rounded-full w-full"></div>
                <div className="h-1.5 lg:h-2 bg-gray-200 rounded-full w-4/5"></div>
                <div className="h-1.5 lg:h-2 bg-gray-200 rounded-full w-5/6"></div>
              </div>
            </div>
          </div>
        );
        
      case "teachers":
        return (
          <div className="flex justify-center space-x-6 sm:space-x-8 lg:space-x-12">
            {/* Emma */}
            <div className="text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mb-3 lg:mb-4 rounded-full overflow-hidden">
                <img 
                  src={emmaImage} 
                  alt="Emma" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-1 text-gray-800">Emma</h4>
              <p className="text-xs lg:text-sm text-gray-600">#친근 #유창 </p>
            </div>
            
            {/* Steve */}
            <div className="text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mb-3 lg:mb-4 rounded-full overflow-hidden">
                <img 
                  src={steveImage} 
                  alt="Steve" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-1 text-gray-800">Steve</h4>
              <p className="text-xs lg:text-sm text-gray-600">#슬랭 #원어민식</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white">
      {/* Navigation */}
      <Navbar />

      {/* Main Container */}
      <div className="pt-20 h-full flex flex-col">
        {/* Carousel Container */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            className="flex transition-transform duration-700 ease-out h-full"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div key={slide.id} className="w-full flex-shrink-0 h-full">
                <div className="h-full flex items-center justify-center px-4 sm:px-6">
                  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-16 items-center">
                    
                    {/* 이미지 섹션 */}
                    <div className="flex justify-center order-2 lg:order-1">
                      {renderImage(slide.imageType)}
                    </div>

                    {/* 텍스트 섹션 */}
                    <div className="text-center lg:text-left space-y-4 sm:space-y-6 order-1 lg:order-2">
                      <div className="space-y-3 sm:space-y-4">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800 leading-tight">
                          {slide.title}
                        </h1>
                        <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-600 font-medium leading-relaxed text-right">
                          {slide.subtitle}
                        </h2>
                      </div>
                      
                      <div className="max-w-xl ml-auto lg:mx-0 text-right">
                        {slide.description.split('\n').map((line, idx) => {
                          const isNote = line.trim().startsWith('*');
                          const text = isNote ? line.replace(/^\s*\*/, '').trim() : line;
                          return (
                            <span
                              key={idx}
                              className={`${isNote ? 'text-xs text-gray-400' : 'text-sm sm:text-base lg:text-lg text-gray-500'} leading-relaxed block`}
                              style={{ marginTop: idx === 0 ? 0 : '2px' }}
                            >
                              {text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pb-12 sm:pb-16 space-y-8 sm:space-y-12 bg-white">
          {/* Dot Navigation */}
          <div className="flex justify-center">
            <div className="flex space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentSlide
                      ? "w-6 h-2 bg-gray-800"
                      : "w-2.5 h-2.5 bg-gray-400 hover:bg-gray-600 transform hover:scale-110"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex justify-center px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto max-w-md sm:max-w-none">
              <Link to="/teacher" className="px-6 sm:px-8 lg:px-10 py-3 sm:py-4 border-2 border-gray-300 text-gray-700 bg-white rounded-[20px] font-semibold text-sm sm:text-base lg:text-lg text-center hover:border-gray-400 transition-colors">
                학습하러 가기
              </Link>
              <Link to="/subscription" className="px-6 sm:px-8 lg:px-10 py-3 sm:py-4 bg-gray-800 text-white rounded-[20px] font-semibold text-sm sm:text-base lg:text-lg text-center hover:bg-gray-700 transition-colors">
                구독하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}