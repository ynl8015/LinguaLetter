import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { GET_LATEST_NEWS, CHAT_WITH_TEACHER, CREATE_SESSION, ANALYZE_FEEDBACK, UPDATE_MY_STATS } from '../lib/apollo';
import emmaImage from "../assets/emma.png";
import steveImage from "../assets/steve.png";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface Teacher {
  id: string;
  name: string;
  image: string;
  description: string;
  personality: string;
}

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

const TypingMessage: React.FC<{ message: Message; onComplete: () => void }> = ({ message, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < message.content.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + message.content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 80);
      return () => clearTimeout(timer);
    } else if (currentIndex === message.content.length && message.content.length > 0) {
      setTimeout(onComplete, 500);
    }
  }, [currentIndex, message.content, onComplete]);

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] p-4 rounded-[20px] bg-gray-100 text-gray-800">
        <p className="leading-relaxed">
          {displayedText}
          {currentIndex < message.content.length && (
            <span className="animate-pulse">|</span>
          )}
        </p>
        <p className="text-xs mt-2 text-gray-500">
          {message.timestamp.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
};

export default function Teacher() {
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(600);
  const [showShortSessionModal, setShowShortSessionModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user, isAuthenticated } = useAuth();

  // GraphQL 쿼리 및 뮤테이션
  const { data: newsData } = useQuery(GET_LATEST_NEWS);
  const [chatWithTeacher] = useMutation(CHAT_WITH_TEACHER);
  const [createSession] = useMutation(CREATE_SESSION);
  const [analyzeFeedback] = useMutation(ANALYZE_FEEDBACK);
  const [updateMyStats] = useMutation(UPDATE_MY_STATS);

  const currentNews: NewsItem | null = newsData?.latestNews || null;

  // 10분 타이머
  useEffect(() => {
    if (sessionStartTime && !sessionEnded) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
        const remaining = Math.max(0, 600 - elapsed);
        setRemainingTime(remaining);
        
        if (remaining === 0) {
          setShowTimeUpModal(true);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [sessionStartTime, sessionEnded]);

  const teachers: Teacher[] = [
    {
      id: 'EMMA',
      name: 'emma',
      image: emmaImage,
      description: '친근한 매력',
      personality: '친근하고 격려하는 스타일로 학습을 도와줍니다. 자연스러운 대화 중에 필요시에만 교정해줍니다.'
    },
    {
      id: 'STEVE',
      name: 'steve',
      image: steveImage,
      description: '자연스러운 대화',
      personality: '자연스러운 대화를 통해 실전 영어 감각을 길러줍니다. 편안한 분위기에서 자유롭게 대화합니다.'
    }
  ];

  const selectTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSessionStartTime(new Date());
    setRemainingTime(600);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedTeacher || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    try {
      // GraphQL 뮤테이션으로 AI 선생님과 채팅
      const result = await chatWithTeacher({
        variables: {
          input: {
            teacher: selectedTeacher.name, // name 사용 (소문자)
            message: currentInput,
            history: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            topic: currentNews ? `Today's news about ${currentNews.trendTopic}: ${currentNews.koreanArticle}` : 'General English Practice'
          }
        }
      });

      if (result.data?.chatWithTeacher?.success && result.data.chatWithTeacher.reply) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.data.chatWithTeacher.reply,
          timestamp: new Date(),
          isTyping: true
        };

        setMessages(prev => [...prev, assistantMessage]);
        setTypingMessageId(assistantMessage.id);
      } else {
        console.error('채팅 실패:', result.data?.chatWithTeacher?.error);
      }
    } catch (error) {
      console.error('메시지 전송 오류:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTypingComplete = (messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isTyping: false }
          : msg
      )
    );
    setTypingMessageId(null);
  };

  const endSession = async () => {
    if (!selectedTeacher || messages.length === 0) {
      console.log('세션 종료 조건 불충족:', { selectedTeacher: !!selectedTeacher, messagesLength: messages.length });
      return;
    }

    const userMessages = messages.filter(msg => msg.role === 'user');
    const userInputLength = userMessages.reduce((total, msg) => total + msg.content.length, 0);

    console.log('세션 종료 시작:', { 
      userMessagesCount: userMessages.length, 
      userInputLength, 
      isAuthenticated, 
      hasUser: !!user 
    });

    // 최소 데이터 요구사항 체크 (500자 이상)
    if (userInputLength < 500) {
      console.log('최소 데이터 요구사항 미충족:', userInputLength, '(500자 이상 필요)');
      setShowShortSessionModal(true);
      return;
    }

    // 로그인이 안 되어 있으면 로그인 유도
    if (!isAuthenticated || !user) {
      console.log('로그인되지 않은 사용자, 로그인 유도');
      const tempSession = {
        teacher: selectedTeacher.name, // name 사용
        teacherName: selectedTeacher.name,
        topic: currentNews ? currentNews.trendTopic : 'General Practice',
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString()
        })),
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('tempSession', JSON.stringify(tempSession));
      setShowLoginPrompt(true);
      return;
    }

    setSessionEnded(true);

    try {
      console.log('세션 생성 시작...');
      // 1. 세션 생성
      const sessionResult = await createSession({
        variables: {
          input: {
            teacher: selectedTeacher.name, // name 사용
            topic: currentNews ? currentNews.trendTopic : 'General Practice',
            summary: `${selectedTeacher.name}과 ${currentNews ? currentNews.trendTopic : '일반 영어'} 주제로 ${messages.length}개 메시지 대화`,
            feedback: []
          }
        }
      });

      console.log('세션 생성 결과:', sessionResult);

      if (sessionResult.data?.createSession) {
        const sessionId = sessionResult.data.createSession.id;

        // 2. 피드백 분석 (백그라운드)
        try {
          await analyzeFeedback({
            variables: {
              input: {
                sessionId,
                messages: messages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                teacher: selectedTeacher.name, // name 사용
                topic: currentNews ? currentNews.trendTopic : 'General Practice'
              }
            }
          });
        } catch (feedbackError) {
          console.error('피드백 분석 실패:', feedbackError);
        }

        // 3. 통계 업데이트 (백그라운드)
        try {
          await updateMyStats({
            variables: {
              messagesCount: messages.length
            }
          });
        } catch (statsError) {
          console.error('통계 업데이트 실패:', statsError);
        }

        // 대시보드로 이동
        console.log('세션 종료 완료, 대시보드로 이동...');
        window.location.href = '/dashboard';
      } else {
        console.error('세션 생성 실패: 응답 데이터 없음');
        setSessionEnded(false);
      }
    } catch (error) {
      console.error('세션 종료 오류:', error);
      console.error('에러 상세:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError
      });
      setSessionEnded(false);
      
      // 사용자에게 알림
      alert('세션 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const saveShortSession = async () => {
    if (!user || !selectedTeacher) return;
    
    try {
      await createSession({
        variables: {
          input: {
            teacher: selectedTeacher.name, // name 사용
            topic: currentNews ? currentNews.trendTopic : 'General Practice',
            summary: `${selectedTeacher.name}과 짧은 대화 (${messages.filter(m => m.role === 'user').length}개 메시지)`,
            feedback: []
          }
        }
      });

      setSessionEnded(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      console.error('짧은 세션 저장 오류:', error);
    }
  };

  const resetSession = () => {
    setMessages([]);
    setSessionEnded(false);
    setTypingMessageId(null);
    setSessionStartTime(null);
    setRemainingTime(600);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 로그인 후 임시 세션 복구
  useEffect(() => {
    if (isAuthenticated && user && teachers.length > 0) {
      const tempSession = localStorage.getItem('tempSession');
      if (tempSession) {
        try {
          const sessionData = JSON.parse(tempSession);
          
          const teacher = teachers.find(t => t.name === sessionData.teacher); // name으로 찾기
          if (teacher) {
            setSelectedTeacher(teacher);
          }
          
          const restoredMessages = sessionData.messages.map((msg: any) => ({
            id: msg.id || `restored-${Date.now()}-${Math.random()}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(restoredMessages);
          
          localStorage.removeItem('tempSession');
          
          setTimeout(() => {
            endSession();
          }, 1000);
          
        } catch (error) {
          console.error('임시 세션 복구 오류:', error);
          localStorage.removeItem('tempSession');
        }
      }
    }
  }, [isAuthenticated, user, teachers]);

  if (!selectedTeacher) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <div className="pt-28 px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">선생님 선택</h1>
              <p className="text-lg text-gray-600 mb-6">함께 대화할 선생님을 선택해주세요</p>
              
              {currentNews && (
                <div className="bg-gray-50 rounded-[20px] p-6 mb-8 max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">오늘의 학습 주제</h3>
                  <div className="text-left">
                    <span className="inline-block bg-gray-800 text-white px-3 py-1 rounded-[12px] text-sm font-medium mb-3">
                      {currentNews.trendTopic}
                    </span>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                      {currentNews.koreanArticle}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      핵심 표현: <span className="font-medium">{currentNews.expression}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-white border-2 border-gray-200 rounded-[20px] p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:border-gray-400"
                  onClick={() => selectTeacher(teacher)}
                >
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden">
                      <img 
                        src={teacher.image}
                        alt={teacher.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{teacher.name}</h2>
                    <p className="text-lg text-gray-600 mb-4">{teacher.description}</p>
                    <p className="text-sm text-gray-500">{teacher.personality}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <Navbar 
        showEndSessionButton={messages.length > 0 && !sessionEnded}
        onEndSession={() => {
          console.log('네비바에서 수업 마치기 버튼 클릭됨');
          console.log('현재 상태:', { 
            messagesLength: messages.length, 
            sessionEnded, 
            selectedTeacher: !!selectedTeacher,
            userMessages: messages.filter(m => m.role === 'user').length
          });
          endSession();
        }}
      />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full pt-20">
        {/* 타이머 */}
        {sessionStartTime && !sessionEnded && (
          <div className="px-6 py-2 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  입력한 글자: {messages.filter(m => m.role === 'user').reduce((total, msg) => total + msg.content.length, 0)}자
                </span>
                {messages.filter(m => m.role === 'user').reduce((total, msg) => total + msg.content.length, 0) < 500 && (
                  <span className="text-orange-500 text-sm font-medium">
                    (500자 필요 - 피드백 분석용)
                  </span>
                )}
              </div>
              <span className={`text-sm font-mono ${remainingTime < 60 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                ⏱️ {formatTime(remainingTime)}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden">
                <img 
                  src={selectedTeacher.image}
                  alt={selectedTeacher.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-gray-600 text-lg">
                안녕하세요! {selectedTeacher.name}입니다. 
              </p>
              {currentNews ? (
                <div className="mt-4 max-w-md mx-auto">
                  <p className="text-gray-500 text-sm mb-3">
                    오늘은 <span className="font-medium">"{currentNews.trendTopic}"</span> 주제로 대화해보아요!
                  </p>
                  <div className="bg-gray-50 p-4 rounded-[12px] text-left">
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {currentNews.koreanArticle}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      핵심 표현: <span className="font-medium">{currentNews.expression}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm mt-2">
                  자유롭게 영어로 대화해보세요!
                </p>
              )}
            </div>
          )}
          
          {messages.map((message) => (
            message.role === 'assistant' && message.isTyping && message.id === typingMessageId ? (
              <TypingMessage 
                key={message.id}
                message={message}
                onComplete={() => handleTypingComplete(message.id)}
              />
            ) : (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-4 rounded-[20px] ${
                    message.role === 'user'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            )
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-4 rounded-[20px]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-200">
          {currentNews && messages.length === 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-[12px] text-sm text-gray-600">
              "{currentNews.expression}" 표현을 사용해서 대화해보세요!
            </div>
          )}
          
          {sessionEnded ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">수업이 완료되었습니다!</p>
              <div className="space-x-4">
                <button
                  onClick={resetSession}
                  className="px-8 py-3 bg-gray-800 text-white rounded-[20px] font-semibold"
                >
                  새 대화 시작
                </button>
                <Link 
                  to="/dashboard"
                  className="inline-block px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-[20px] font-semibold hover:border-gray-400 transition-colors"
                >
                  마이페이지 보기
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex space-x-4">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentNews 
                  ? `"${currentNews.expression}" 표현에 대해 이야기해보세요...`
                  : "메시지를 입력하세요..."
                }
                className="flex-1 p-4 border-2 border-gray-200 rounded-[20px] resize-none focus:outline-none focus:border-gray-400"
                rows={3}
                disabled={isTyping || typingMessageId !== null}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping || typingMessageId !== null}
                className="px-8 py-4 bg-gray-800 text-white rounded-[20px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                전송
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 로그인 유도 모달 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] max-w-md w-full p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-3">대화를 저장하시겠어요?</h3>
              <p className="text-gray-600 leading-relaxed">
                로그인하시면 대화 내용을 저장하고 <br />
                <span className="font-semibold">개인 맞춤 피드백</span>을 받을 수 있어요!
              </p>
            </div>
            
            <div className="space-y-3">
              <Link
                to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="block w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium text-center hover:bg-gray-800 transition-colors"
              >
                로그인하고 저장하기
              </Link>
              
              <button
                onClick={() => {
                  setShowLoginPrompt(false);
                  setMessages([]);
                  setSelectedTeacher(null);
                  setSessionEnded(false);
                }}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                저장하지 않고 새 대화 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시간 종료 모달 */}
      {showTimeUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] max-w-md w-full p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">시간 종료!</h3>
              <p className="text-gray-600 leading-relaxed">
                10분 대화 시간이 종료되었습니다.<br />
                지금까지의 대화를 저장하시겠어요?
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowTimeUpModal(false);
                  endSession();
                }}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                저장하기
              </button>
              
              <button
                onClick={() => {
                  setShowTimeUpModal(false);
                  resetSession();
                }}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                저장하지 않고 새 대화 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 짧은 세션 모달 */}
      {showShortSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] max-w-md w-full p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-3">대화가 짧아요</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  현재 입력: <span className="font-bold text-gray-800">{messages.filter(m => m.role === 'user').reduce((total, msg) => total + msg.content.length, 0)}자</span>
                </p>
                <p className="text-sm text-gray-600">
                  필요: <span className="font-bold text-gray-800">500자</span>
                </p>
              </div>
              <p className="text-gray-600 leading-relaxed">
                점수 분석을 위해서는 더 많은 대화가 필요해요
              </p>
            </div>
            
            <div className="space-y-3">
              {!isAuthenticated ? (
                <>
                  <Link
                    to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                    className="block w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium text-center hover:bg-gray-800 transition-colors"
                  >
                    로그인하고 기록 남기기
                  </Link>
                  <button
                    onClick={() => setShowShortSessionModal(false)}
                    className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    더 대화하기
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowShortSessionModal(false);
                      saveShortSession();
                    }}
                    className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    기록만 남기기
                  </button>
                  <button
                    onClick={() => setShowShortSessionModal(false)}
                    className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    더 대화하기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}