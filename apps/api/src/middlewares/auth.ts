// middlewares/auth.ts
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { verifyAuthToken, createSessionActivityChecker } from '../services/authService';

// 세션 활동 추적기 초기화
const { recordActivity } = createSessionActivityChecker();

// Context 타입 정의
export interface Context {
  user?: any;
  tempUser?: boolean;
  prisma: any;
  request?: any;
}

// 메인 Context 생성 함수
export async function createContext(request: any): Promise<Context> {
  const authHeader = request?.headers?.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, tempUser: false, prisma, request };
  }

  const token = authHeader.substring(7);
  
  try {
    const verification = await verifyAuthToken(token);
    
    if (!verification.valid) {
      console.log('Token verification failed:', verification.error);
      return { user: null, tempUser: false, prisma, request };
    }
    
    // 임시 토큰인 경우 제한적 접근만 허용
    if (verification.status === 'TEMP') {
      console.log('Temp token detected for user:', verification.decoded.userId);
      return { 
        user: verification.decoded, 
        tempUser: true,
        prisma, 
        request 
      };
    }
    
    // 정상 토큰인 경우 활동 기록
    if (verification.status === 'VALID') {
      recordActivity(verification.decoded.userId);
    }
    
    return { 
      user: verification.decoded, 
      tempUser: false,
      prisma, 
      request 
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { user: null, tempUser: false, prisma, request };
  }
}

// 기본 인증 요구 (로그인만 확인 - 임시 토큰도 허용)
export function requireAuth(user: any) {
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }
  return user;
}

// 완전한 인증 요구 (동의서까지 완료된 사용자만)
export function requireFullAuth(user: any, tempUser: boolean = false) {
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }
  
  if (tempUser) {
    throw new Error('동의서 작성을 완료해주세요.');
  }
  
  return user;
}

// 관리자 권한 확인
export function requireAdmin(user: any, tempUser: boolean = false) {
  const authenticatedUser = requireFullAuth(user, tempUser);
  
  if (authenticatedUser.role !== 'ADMIN' && authenticatedUser.email !== 'yuunalee1050@gmail.com') {
    throw new Error('관리자 권한이 필요합니다.');
  }
  
  return authenticatedUser;
}

// 토큰에서 사용자 ID만 추출 (임시 토큰도 허용)
export function extractUserId(user: any) {
  if (!user) {
    throw new Error('인증이 필요합니다.');
  }
  
  return user.userId || user.id;
}

// JWT 토큰 직접 검증 (서비스에서 사용)
export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// 토큰 무효화 여부 확인
export async function isTokenInvalidated(tokenId: string, userId: string): Promise<boolean> {
  try {
    const invalidatedToken = await prisma.invalidatedToken.findFirst({
      where: {
        tokenId,
        userId,
        expiresAt: { gt: new Date() }
      }
    });
    
    return !!invalidatedToken;
  } catch (error) {
    console.error('Token invalidation check failed:', error);
    return false;
  }
}

// GraphQL Context 생성 함수 (특화)
export async function createGraphQLContext(request: any): Promise<Context> {
  const context = await createContext(request);
  
  // GraphQL에서는 tempUser 상태도 명확히 구분
  return {
    user: context.user,
    tempUser: context.tempUser,
    prisma: context.prisma,
    request: context.request
  };
}

// 활동 기록 함수 (외부에서 직접 호출 가능)
export function recordUserActivity(userId: string) {
  recordActivity(userId);
}

// 토큰 타입별 권한 확인
export function checkTokenPermission(user: any, tempUser: boolean, requiredLevel: 'none' | 'temp' | 'full' | 'admin' = 'full') {
  switch (requiredLevel) {
    case 'none':
      return true;
    case 'temp':
      return !!user; // 임시 토큰도 허용
    case 'full':
      return user && !tempUser; // 완전한 인증만 허용
    case 'admin':
      return user && !tempUser && (user.role === 'ADMIN' || user.email === 'yuunalee1050@gmail.com'); // 관리자만 허용
    default:
      return false;
  }
}

// 권한 확인 데코레이터 함수
export function withAuth(requiredLevel: 'none' | 'temp' | 'full' | 'admin' = 'full') {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const context = args[2]; // GraphQL resolver에서 context는 세번째 인자
      
      if (!checkTokenPermission(context.user, context.tempUser, requiredLevel)) {
        switch (requiredLevel) {
          case 'temp':
            throw new Error('로그인이 필요합니다.');
          case 'full':
            throw new Error(context.tempUser ? '동의서 작성을 완료해주세요.' : '로그인이 필요합니다.');
          case 'admin':
            throw new Error('관리자 권한이 필요합니다.');
          default:
            throw new Error('권한이 부족합니다.');
        }
      }
      
      return method.apply(this, args);
    };
  };
}

// 세션 타임아웃 체크 미들웨어
export function createSessionTimeoutMiddleware(timeoutMinutes: number = 30) {
  const sessions = new Map<string, number>();
  
  return {
    // 세션 활동 기록
    recordSession: (userId: string) => {
      sessions.set(userId, Date.now());
      console.log(`Session activity recorded for user: ${userId}`);
    },
    
    // 세션 타임아웃 체크
    checkTimeout: (userId: string): boolean => {
      const lastActivity = sessions.get(userId);
      if (!lastActivity) return true; // 세션 정보 없음
      
      const now = Date.now();
      const timeout = timeoutMinutes * 60 * 1000;
      const isTimedOut = (now - lastActivity) > timeout;
      
      if (isTimedOut) {
        console.log(`Session timeout for user: ${userId}`);
      }
      
      return isTimedOut;
    },
    
    // 세션 제거
    removeSession: (userId: string) => {
      const removed = sessions.delete(userId);
      if (removed) {
        console.log(`Session removed for user: ${userId}`);
      }
    },
    
    // 모든 만료된 세션 정리
    cleanupExpiredSessions: async () => {
      const now = Date.now();
      const timeout = timeoutMinutes * 60 * 1000;
      const expiredUsers: string[] = [];
      
      for (const [userId, lastActivity] of sessions.entries()) {
        if ((now - lastActivity) > timeout) {
          expiredUsers.push(userId);
          sessions.delete(userId);
        }
      }
      
      if (expiredUsers.length > 0) {
        console.log(`Cleaned up ${expiredUsers.length} expired sessions`);
        
        // DB에 만료된 세션들을 무효화 토큰으로 기록
        try {
          const invalidationPromises = expiredUsers.map(userId => 
            prisma.invalidatedToken.create({
              data: {
                userId: userId,
                tokenId: `${userId}_session_timeout_${now}`,
                reason: 'session_timeout',
                expiresAt: new Date(now + 24 * 60 * 60 * 1000) // 24시간 후 정리
              }
            }).catch((error: any) => {
              console.error(`Failed to record session timeout for user ${userId}:`, error);
            })
          );
          
          await Promise.allSettled(invalidationPromises);
        } catch (error) {
          console.error('Failed to record session timeouts:', error);
        }
      }
    },
    
    // 현재 활성 세션 수
    getActiveSessionCount: () => sessions.size,
    
    // 특정 사용자의 마지막 활동 시간
    getLastActivity: (userId: string): Date | null => {
      const lastActivity = sessions.get(userId);
      return lastActivity ? new Date(lastActivity) : null;
    }
  };
}

// 전역 세션 타임아웃 관리자
export const sessionManager = createSessionTimeoutMiddleware(30);

// 세션 정리 작업을 10분마다 실행
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10분
let cleanupInterval: NodeJS.Timeout;

// 서버 시작시 정리 작업 스케줄링
export function startSessionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  cleanupInterval = setInterval(() => {
    sessionManager.cleanupExpiredSessions();
  }, CLEANUP_INTERVAL);
  
  console.log('Session cleanup scheduler started');
}

// 서버 종료시 정리 작업 중단
export function stopSessionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    console.log('Session cleanup scheduler stopped');
  }
}

// 사용자별 접근 로그 (선택적)
export interface AccessLog {
  userId: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export function logUserAccess(context: Context, endpoint: string, method: string = 'UNKNOWN'): void {
  if (!context.user) return;
  
  const accessLog: AccessLog = {
    userId: context.user.userId || context.user.id,
    endpoint,
    method,
    timestamp: new Date(),
    userAgent: context.request?.headers?.['user-agent'],
    ip: context.request?.ip || context.request?.connection?.remoteAddress
  };
  
  // 여기서 로그를 저장하거나 외부 로깅 시스템으로 전송
  console.log('User access:', JSON.stringify(accessLog));
}

// Express/Fastify 미들웨어 형태로 사용할 수 있는 함수
export function createAuthMiddleware() {
  return async (request: any, reply: any, next?: any) => {
    try {
      const context = await createContext(request);
      
      // 요청 객체에 인증 정보 추가
      request.user = context.user;
      request.tempUser = context.tempUser;
      request.authContext = context;
      
      if (next) next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      if (reply && reply.status) {
        reply.status(401).send({ error: 'Authentication failed' });
      } else if (next) {
        next(error);
      }
    }
  };
}

// 서버 시작시 자동으로 세션 정리 스케줄러 시작
if (process.env.NODE_ENV !== 'test') {
  startSessionCleanup();
}