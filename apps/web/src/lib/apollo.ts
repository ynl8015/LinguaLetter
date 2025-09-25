import { ApolloClient, InMemoryCache, createHttpLink, from, gql } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// HTTP 링크 생성
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

// 인증 링크 - JWT 토큰을 헤더에 추가
const authLink = setContext((_, { headers }) => {
  // token 또는 tempToken 둘 다 확인
  const token = localStorage.getItem('token') || localStorage.getItem('tempToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

// 에러 처리 링크
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`);
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }
});

// Apollo Client 생성
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all'
    },
    query: {
      errorPolicy: 'all'
    }
  }
});

// GraphQL 쿼리

// 사용자 관련 쿼리
export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      name
      picture
      provider
      role
      createdAt
      lastLogin
    }
  }
`;

export const GET_MY_STATS = gql`
  query GetMyStats {
    myStats {
      id
      userId
      totalSessions
      totalMessages
      streakDays
      lastStudyDate
      createdAt
      updatedAt
    }
  }
`;

export const GET_MY_SESSIONS = gql`
  query GetMySessions($limit: Int) {
    mySessions(limit: $limit) {
      id
      userId
      teacher
      topic
      summary
      feedback
      createdAt
    }
  }
`;

export const GET_MY_FEEDBACKS = gql`
  query GetMyFeedbacks($limit: Int) {
    myFeedbacks(limit: $limit) {
      id
      sessionId
      userId
      overallScore
      overallGrade
      grammarScore
      vocabularyScore
      fluencyScore
      comprehensionScore
      naturalnessScore
      strengths
      improvements
      corrections {
        original
        corrected
        reason
      }
      recommendedFocus
      nextTopics
      createdAt
    }
  }
`;

export const GET_MY_SUBSCRIPTION_STATUS = gql`
  query GetMySubscriptionStatus {
    mySubscriptionStatus {
      isSubscribed
      subscribedAt
      confirmedAt
    }
  }
`;

// 뉴스 관련 쿼리
export const GET_LATEST_NEWS = gql`
  query GetLatestNews {
    latestNews {
      id
      trendTopic
      koreanArticle
      englishTranslation
      expression
      literalTranslation
      idiomaticTranslation
      reason
      createdAt
    }
  }
`;

export const GET_NEWS_HISTORY = gql`
  query GetNewsHistory($limit: Int) {
    newsHistory(limit: $limit) {
      id
      trendTopic
      koreanArticle
      englishTranslation
      expression
      literalTranslation
      idiomaticTranslation
      reason
      createdAt
    }
  }
`;

export const GET_ALL_NEWS = gql`
  query GetAllNews($limit: Int) {
    allNews(limit: $limit) {
      id
      trendTopic
      koreanArticle
      englishTranslation
      expression
      literalTranslation
      idiomaticTranslation
      reason
      createdAt
    }
  }
`;

// 뮤테이션-----------------

// 사용자 관련 뮤테이션
export const SUBMIT_CONSENT = gql`
  mutation SubmitConsent($input: ConsentInput!) {
    submitConsent(input: $input) {
      id
      userId
      termsAccepted
      privacyAccepted
      newsletterOptIn
      termsVersion
      privacyVersion
      newsletterVersion
      createdAt
    }
  }
`;

export const SEND_NEWSLETTER_TO_ALL = gql`
  mutation SendNewsletterToAllSubscribers($newsId: String!) {
    sendNewsletterToAllSubscribers(newsId: $newsId) {
      success
      error
      message
      count
      total
    }
  }
`;

export const UPDATE_MY_STATS = gql`
  mutation UpdateMyStats($messagesCount: Int!) {
    updateMyStats(messagesCount: $messagesCount) {
      id
      userId
      totalSessions
      totalMessages
      streakDays
      lastStudyDate
      updatedAt
    }
  }
`;

// 채팅/세션 관련 뮤테이션
export const CHAT_WITH_TEACHER = gql`
  mutation ChatWithTeacher($input: ChatInput!) {
    chatWithTeacher(input: $input) {
      success
      error
      reply
    }
  }
`;

export const CREATE_SESSION = gql`
  mutation CreateSession($input: CreateSessionInput!) {
    createSession(input: $input) {
      id
      userId
      teacher
      topic
      summary
      feedback
      createdAt
    }
  }
`;

export const ANALYZE_FEEDBACK = gql`
  mutation AnalyzeFeedback($input: FeedbackInput!) {
    analyzeFeedback(input: $input) {
      id
      sessionId
      userId
      overallScore
      overallGrade
      grammarScore
      vocabularyScore
      fluencyScore
      comprehensionScore
      naturalnessScore
      strengths
      improvements
      corrections {
        original
        corrected
        reason
      }
      recommendedFocus
      nextTopics
      createdAt
    }
  }
`;

// 뉴스레터 관련 뮤테이션
export const SUBSCRIBE_NEWSLETTER = gql`
  mutation SubscribeNewsletter($email: String!) {
    subscribeNewsletter(email: $email) {
      success
      error
      message
    }
  }
`;

export const UNSUBSCRIBE_NEWSLETTER = gql`
  mutation UnsubscribeNewsletter($email: String!) {
    unsubscribeNewsletter(email: $email) {
      success
      error
      message
    }
  }
`;

export const UNSUBSCRIBE_BY_TOKEN = gql`
  mutation UnsubscribeByToken($token: String!) {
    unsubscribeByToken(token: $token) {
      success
      error
      message
    }
  }
`;

// 관리자 전용 뮤테이션
export const GENERATE_DAILY_NEWS = gql`
  mutation GenerateDailyNews {
    generateDailyNews {
      success
      error
      data {
        id
        trendTopic
        koreanArticle
        englishTranslation
        expression
        literalTranslation
        idiomaticTranslation
        reason
        createdAt
      }
    }
  }
`;

export const CREATE_NEWS = gql`
  mutation CreateNews($input: NewsInput!) {
    createNews(input: $input) {
      id
      trendTopic
      koreanArticle
      englishTranslation
      expression
      literalTranslation
      idiomaticTranslation
      reason
      createdAt
    }
  }
`;

export const UPDATE_NEWS = gql`
  mutation UpdateNews($id: String!, $input: NewsInput!) {
    updateNews(id: $id, input: $input) {
      id
      trendTopic
      koreanArticle
      englishTranslation
      expression
      literalTranslation
      idiomaticTranslation
      reason
      createdAt
    }
  }
`;

export const DELETE_NEWS = gql`
  mutation DeleteNews($id: String!) {
    deleteNews(id: $id) {
      success
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount {
    deleteAccount {
      success
      error
      message
    }
  }
`;