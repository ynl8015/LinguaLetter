export const typeDefs = `#graphql
  # 공통 타입들
  type User {
    id: ID!
    email: String!
    name: String
    role: UserRole
    picture: String
    provider: String!
    createdAt: String!
    lastLogin: String!
    stats: UserStats
    sessions: [Session!]!
    feedbacks: [FeedbackAnalysis!]!
  }

  type Article {
    id: ID!
    trendTopic: String!
    koreanArticle: String!
    englishTranslation: String!
    expression: String!
    literalTranslation: String!
    idiomaticTranslation: String!
    reason: String!
    createdAt: String!
  }

  type UserStats {
    id: Int!
    userId: String!
    totalSessions: Int!
    totalMessages: Int!
    streakDays: Int!
    lastStudyDate: String
    createdAt: String!
    updatedAt: String!
  }

  type Session {
    id: ID!
    userId: String!
    teacher: String!
    topic: String!
    summary: String
    feedback: [String!]!
    createdAt: String!
    user: User!
    feedbackAnalysis: [FeedbackAnalysis!]!
  }
  
  type Correction {
  original: String
  corrected: String
  reason: String
}
  
  type FeedbackAnalysis {
    id: Int!
    sessionId: String!
    userId: String!
    overallScore: Float!
    overallGrade: String!
    grammarScore: Float!
    vocabularyScore: Float!
    fluencyScore: Float!
    comprehensionScore: Float!
    naturalnessScore: Float!
    strengths: [String!]!
    improvements: [String!]!
    corrections: [Correction!]!
    recommendedFocus: String!
    nextTopics: [String!]!
    createdAt: String!
    user: User!
    session: Session!
  }

  type ChatMessage {
    role: String!
    content: String!
  }

  # Input 타입들
  input NewsInput {
    trendTopic: String!
    koreanArticle: String!
    englishTranslation: String!
    expression: String!
    literalTranslation: String!
    idiomaticTranslation: String!
    reason: String!
  }

  input ConsentInput {
    termsAccepted: Boolean!
    privacyAccepted: Boolean!
    newsletterOptIn: Boolean!
    termsVersion: String!
    privacyVersion: String!
    newsletterVersion: String!
  }
  
  input ChatInput {
    topic: String!
    message: String!
    history: [ChatMessageInput!]!
    teacher: TeacherType!
  }

  input ChatMessageInput {
    role: String!
    content: String!
  }

  input CreateSessionInput {
    teacher: String!
    topic: String!
    summary: String
    feedback: [String!]!
  }

  input FeedbackInput {
    sessionId: String!
    messages: [ChatMessageInput!]!
    teacher: String!
    topic: String!
  }

  # Enum 타입들
  enum UserRole {
    USER
    ADMIN
  }
    enum TeacherType {
     emma
     steve
   }

  # 결과 타입들
  interface Result {
    success: Boolean!
    error: String
  }

  type ConsentInfo {
    required: Boolean!
    currentVersions: ConsentVersions!
    latest: UserConsent
  }

  type ConsentVersions {
    terms: String!
    privacy: String!
    newsletter: String!
  }

  type UserConsent {
    id: Int!
    userId: String!
    termsAccepted: Boolean!
    privacyAccepted: Boolean!
    newsletterOptIn: Boolean!
    termsVersion: String!
    privacyVersion: String!
    newsletterVersion: String!
    createdAt: String!
  }

  type ChatResult implements Result {
    success: Boolean!
    error: String
    reply: String
  }

  type NewsGenerationResult implements Result {
    success: Boolean!
    error: String
    data: Article
  }

  type SubscriptionResult implements Result {
    success: Boolean!
    error: String
    message: String
  }

  type DeleteResult implements Result {
    success: Boolean!
    error: String
  }

  # Queries
  type Query {
    # 현재 사용자 정보 (토큰은 헤더에서)
    me: User
    
    # 뉴스 관련
    latestNews: Article
    newsHistory(limit: Int): [Article!]!
    allNews(limit: Int): [Article!]!  # 관리자 전용
    
    # 사용자 정보 (인증 필요)
    myStats: UserStats
    mySessions(limit: Int): [Session!]!
    myFeedbacks(limit: Int): [FeedbackAnalysis!]!
    
    # 특정 세션 피드백
    sessionFeedback(sessionId: String!): FeedbackAnalysis
  }

  # Mutations
  type Mutation {
    # 동의서
    submitConsent(input: ConsentInput!): UserConsent!
    
    # AI 채팅
    chatWithTeacher(input: ChatInput!): ChatResult!
    
    # 세션 관리
    createSession(input: CreateSessionInput!): Session!
    
    # 피드백 분석
    analyzeFeedback(input: FeedbackInput!): FeedbackAnalysis!
    
    # 뉴스 관리
    generateDailyNews: NewsGenerationResult!
    createNews(input: NewsInput!): Article!      # 관리자 전용
    updateNews(id: String!, input: NewsInput!): Article!  # 관리자 전용
    deleteNews(id: String!): DeleteResult!       # 관리자 전용
    
    # 뉴스레터
    subscribeNewsletter(email: String!): SubscriptionResult!
    
    # 사용자 통계 업데이트
    updateMyStats(messagesCount: Int!): UserStats!
  }
`;