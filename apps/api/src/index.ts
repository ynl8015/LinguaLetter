// index.ts
import Fastify from 'fastify';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from '@as-integrations/fastify';
import dotenv from 'dotenv';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { createContext } from './middlewares/auth';
import { confirmSubscription, unsubscribeNewsletter } from './services/newsletterService';
import { handleGoogleAuth, handleKakaoAuth, completeRegistrationAfterConsent, refreshAccessToken } from './services/authService';
import { startScheduler } from './services/schedulerService';
import prisma from './db';
import jwt from 'jsonwebtoken';

// Fastify 타입 확장
declare module 'fastify' {
  interface FastifyRequest {
    cookies: { [key: string]: string };
  }
  interface FastifyReply {
    setCookie(name: string, value: string, options?: any): this;
    clearCookie(name: string, options?: any): this;
  }
}

dotenv.config();

async function start() {
  const app = Fastify({ 
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  });

  // CORS 설정 - 환경변수 기반 + 프리뷰 도메인 허용
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
  await app.register(require('@fastify/cors'), {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      const allow = [
        FRONTEND,                         // e.g. https://lingualetter.ai.kr
        'https://lingualetter.vercel.app' // 필요 시 프리뷰
      ];
      if (!origin || allow.includes(origin)) cb(null, true);
      else cb(new Error('CORS blocked'), false);
    },
    credentials: true,
  });

  // 쿠키 지원 추가
  await app.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET || "my-secret-key",
    parseOptions: {}
  });

  // 공통 쿠키 옵션 - 크로스사이트 요청을 위해 SameSite: 'none' + secure: true
  const cookieOpts = {
    httpOnly: true,
    secure: true,           // 프로덕션은 true
    sameSite: 'none' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
  };

  // ===== 인증 관련 REST 라우트들 =====
  
  // Google OAuth
  app.post('/auth/google', async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await handleGoogleAuth(body);
      
      // 동의서가 필요한 경우와 완전한 로그인을 구분
      if (result.status === 'CONSENT_REQUIRED') {
        reply.status(202); // Accepted - 추가 작업 필요
        return {
          success: true,
          status: 'CONSENT_REQUIRED',
          token: result.token,
          user: result.user,
          consents: result.consents,
          message: '동의서 작성이 필요합니다.'
        };
      }
      
      // 쿠키에 refresh token 설정
      reply.setCookie('refreshToken', result.refreshToken!, cookieOpts);
      
      return {
        success: true,
        status: 'SUCCESS',
        token: result.token,
        user: result.user,
        message: '로그인 성공'
      };
    } catch (error: any) {
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  // Kakao OAuth
  app.post('/auth/kakao', async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await handleKakaoAuth(body);
      
      if (result.status === 'CONSENT_REQUIRED') {
        reply.status(202);
        return {
          success: true,
          status: 'CONSENT_REQUIRED',
          token: result.token,
          user: result.user,
          consents: result.consents,
          message: '동의서 작성이 필요합니다.'
        };
      }
      
      reply.setCookie('refreshToken', result.refreshToken!, cookieOpts);
      
      return {
        success: true,
        status: 'SUCCESS',
        token: result.token,
        user: result.user,
        message: '로그인 성공'
      };
    } catch (error: any) {
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  // ===== 이 부분이 누락되어 있었습니다! =====
  // 동의서 완료 후 정식 로그인
  app.post('/auth/complete-registration', async (request, reply) => {
    try {
      const body = request.body as any;
      const { tempToken } = body;
      
      console.log('Complete registration request received');
      
      if (!tempToken) {
        reply.status(400);
        return { success: false, error: '임시 토큰이 필요합니다.' };
      }
      
      // 임시 토큰에서 사용자 ID 추출
      const decoded = jwt.verify(tempToken, process.env.JWT_SECRET!) as any;
      
      if (decoded.type !== 'temp') {
        reply.status(400);
        return { success: false, error: '유효하지 않은 임시 토큰입니다.' };
      }
      
      console.log('Processing registration completion for user:', decoded.userId);
      
      const result = await completeRegistrationAfterConsent(decoded.userId);
      
      // 쿠키에 refresh token 설정
      reply.setCookie('refreshToken', result.refreshToken, cookieOpts);
      
      console.log('Registration completed successfully');
      
      return {
        success: true,
        token: result.token,
        user: result.user,
        message: '회원가입이 완료되었습니다.'
      };
    } catch (error: any) {
      console.error('Complete registration error:', error);
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  // 토큰 갱신
  app.post('/auth/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      
      if (!refreshToken) {
        reply.status(401);
        return { success: false, error: '리프레시 토큰이 없습니다.' };
      }
      
      const result = await refreshAccessToken(refreshToken);
      
      return {
        success: true,
        token: result.token,
        user: result.user
      };
    } catch (error: any) {
      // 리프레시 토큰도 만료된 경우 쿠키 삭제
      reply.clearCookie('refreshToken');
      reply.status(401);
      return { success: false, error: '로그인이 필요합니다.' };
    }
  });

  // 토큰 검증
  app.post('/auth/verify', async (request, reply) => {
    try {
      const { token } = request.body as any;
      if (!token) {
        return reply.status(401).send({ valid: false, error: 'Token required' });
      }

      const { verifyAuthToken } = await import('./services/authService');
      const verification = await verifyAuthToken(token);
      
      if (verification.valid) {
        return { 
          valid: true, 
          user: verification.user || verification.decoded,
          status: verification.status 
        };
      } else {
        return reply.status(401).send({ 
          valid: false, 
          error: verification.error 
        });
      }
    } catch (error: any) {
      return reply.status(401).send({ 
        valid: false, 
        error: error.message 
      });
    }
  });

  // 계정 상태 확인 (동의서 상태 포함)
  app.get('/auth/status', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authenticated: false, status: 'UNAUTHENTICATED' };
      }

      const token = authHeader.substring(7);
      const { verifyAuthToken } = await import('./services/authService');
      const verification = await verifyAuthToken(token);
      
      if (!verification.valid) {
        return { 
          authenticated: false, 
          status: 'UNAUTHENTICATED',
          error: verification.error 
        };
      }

      return {
        authenticated: true,
        status: verification.status,
        user: verification.user || verification.decoded
      };
    } catch (error: any) {
      return { 
        authenticated: false, 
        status: 'UNAUTHENTICATED',
        error: error.message 
      };
    }
  });

  // 로그아웃
  app.post('/auth/logout', async (request, reply) => {
    try {
      // 리프레시 토큰 쿠키 삭제
      reply.clearCookie('refreshToken');
      
      // 헤더에서 액세스 토큰 가져와서 무효화 처리
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          
          await prisma.invalidatedToken.create({
            data: {
              userId: decoded.userId,
              tokenId: `${decoded.userId}_${decoded.iat}`,
              reason: 'logout',
              expiresAt: new Date(decoded.exp * 1000)
            }
          });
        } catch (error) {
          // 토큰이 이미 만료되었을 수 있음
          console.log('Token already expired or invalid during logout');
        }
      }
      
      return { 
        success: true, 
        message: '로그아웃되었습니다.' 
      };
    } catch (error: any) {
      return { 
        success: true, 
        message: '로그아웃되었습니다.' 
      };
    }
  });

  // 카카오 콜백 (리디렉트용)
  app.get('/auth/kakao/callback', async (request, reply) => {
    const { code, state } = request.query as any;
    
    if (!code) {
      return reply.status(400).send('Authorization code missing');
    }

    try {
      const redirectUri = process.env.KAKAO_REDIRECT_URI || (process.env.NODE_ENV === 'production' 
        ? 'https://lingualetter.ai.kr/auth/kakao/callback' 
        : 'http://localhost:4000/auth/kakao/callback');
      
      console.log('Kakao redirect URI:', redirectUri);
      console.log('KAKAO_REDIRECT_URI env var:', process.env.KAKAO_REDIRECT_URI);
      
      const result = await handleKakaoAuth({
        authCode: code,
        redirectUri: redirectUri
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (result.status === 'CONSENT_REQUIRED') {
        const params = new URLSearchParams({
          token: result.token,
          status: 'CONSENT_REQUIRED',
          success: result.success.toString()
        });
        return reply.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
      }
      
      reply.setCookie('refreshToken', result.refreshToken!, cookieOpts);
      
      const params = new URLSearchParams({
        token: result.token,
        status: 'SUCCESS',
        success: result.success.toString()
      });
      return reply.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);

    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
  });

  // ===== GraphQL 설정 =====
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [fastifyApolloDrainPlugin(app)],
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code || 'INTERNAL_ERROR',
        path: error.path
      };
    }
  });

  await server.start();

  // GraphQL 엔드포인트
  app.route({
    url: '/graphql',
    method: ['GET', 'POST', 'OPTIONS'],
    handler: fastifyApolloHandler(server, {
      context: async (request) => {
        return await createContext(request);
      }
    })
  });

  // ===== 뉴스레터 관련 라우트 =====
  
  // 뉴스레터 확인 REST 엔드포인트
  app.get('/newsletter/confirm/:token', async (request: any, reply) => {
    try {
      const result = await confirmSubscription(request.params.token);
      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>LinguaLetter - 구독 완료</title>
            <style>
              body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
              .success { color: #059669; font-size: 18px; margin: 20px 0; }
              .btn { background: #000; color: #fff; text-decoration: none; padding: 15px 30px; border-radius: 8px; display: inline-block; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h2>구독이 완료되었습니다!</h2>
            <div class="success">매일 아침 6시에 레슨을 보내드릴게요.</div>
            <a href="/" class="btn">홈으로 가기</a>
          </body>
        </html>
      `);
    } catch (error: any) {
      return reply.code(400).type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>오류</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>오류가 발생했습니다</h2>
            <p>${error.message}</p>
          </body>
        </html>
      `);
    }
  });

  // 구독 해지 페이지 (GET)
  app.get('/newsletter/unsubscribe/:token', async (request: any, reply) => {
    const { token } = request.params;
    
    try {
      const subscriber = await prisma.newsletterSubscriber.findUnique({
        where: { unsubscribeToken: token }
      });

      if (!subscriber) {
        return reply.code(404).type('text/html').send(`
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>링크 오류</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2>유효하지 않은 링크입니다</h2>
              <p>구독 해지 링크가 만료되었거나 잘못되었습니다.</p>
            </body>
          </html>
        `);
      }

      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>LinguaLetter - 구독 해지</title>
            <style>
              body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; background: #fafafa; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .btn { background: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 10px; border: none; cursor: pointer; }
              .btn-cancel { background: #6b7280; }
              h2 { color: #374151; margin-bottom: 20px; }
              p { color: #6b7280; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>구독을 해지하시겠습니까?</h2>
              <p><strong>${subscriber.email}</strong><br/>
              더 이상 LinguaLetter 뉴스레터를 받지 않으시겠습니까?<br/>
              언제든 다시 구독하실 수 있습니다.</p>
              <div style="margin-top: 30px;">
                <form method="POST" action="/newsletter/unsubscribe/${token}" style="display: inline;">
                  <button type="submit" class="btn">구독 해지하기</button>
                </form>
                <a href="/" class="btn btn-cancel">취소</a>
              </div>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      return reply.code(500).type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>오류</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>오류가 발생했습니다</h2>
            <p>${error.message}</p>
          </body>
        </html>
      `);
    }
  });

  // 구독 해지 처리 (POST)
  app.post('/newsletter/unsubscribe/:token', async (request: any, reply) => {
    try {
      const result = await unsubscribeNewsletter(request.params.token);
      
      return reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>LinguaLetter - 구독 해지 완료</title>
            <style>
              body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; background: #fafafa; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .success { color: #059669; font-size: 18px; margin: 20px 0; }
              .btn { background: #000; color: #fff; text-decoration: none; padding: 15px 30px; border-radius: 8px; display: inline-block; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>구독이 해지되었습니다</h2>
              <div class="success">앞으로 뉴스레터를 받지 않으시게 됩니다.<br/>언제든 다시 구독하실 수 있습니다.</div>
              <a href="/subscription" class="btn">다시 구독하기</a>
              <a href="/" class="btn" style="background: #6b7280; margin-left: 10px;">홈으로 가기</a>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      return reply.code(400).type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>오류</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>구독 해지 중 오류가 발생했습니다</h2>
            <p>${error.message}</p>
          </body>
        </html>
      `);
    }
  });

  // ===== 기본 라우트들 =====
  
  app.get('/', async (request, reply) => {
    return { 
      name: 'LinguaLetter API',
      version: '1.0.0',
      endpoints: {
        graphql: '/graphql',
        auth: '/auth/*',
        health: '/health'
      },
      status: 'running'
    };
  });

  app.get('/health', async (request, reply) => {
    return { 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });

  const port = Number(process.env.PORT) || 4000;
  
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 LinguaLetter API ready at http://localhost:${port}`);
    console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
    console.log(`🔐 Auth endpoints: http://localhost:${port}/auth/*`);
    console.log(`📧 Newsletter endpoints: http://localhost:${port}/newsletter/*`);
    
  // 스케줄러 시작
  startScheduler();
  
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();