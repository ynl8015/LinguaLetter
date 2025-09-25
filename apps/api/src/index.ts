import Fastify from 'fastify';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from '@as-integrations/fastify';
import dotenv from 'dotenv';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { createContext } from './middlewares/auth';
import { confirmSubscription } from './services/newsletterService';
import prisma from './db';
import { handleGoogleAuth, handleKakaoAuth } from './services/authService';

dotenv.config();

async function start() {
  const app = Fastify({ 
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  });

  // CORS 설정
  await app.register(require('@fastify/cors'), {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  });

  // REST 인증 라우트들
  app.post('/auth/google', async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await handleGoogleAuth(body);
      return result;
    } catch (error: any) {
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  app.post('/auth/kakao', async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await handleKakaoAuth(body);
      return result;
    } catch (error: any) {
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  // 카카오 OAuth 콜백 (리디렉트용)
  app.get('/auth/kakao/callback', async (request, reply) => {
    const { code, state } = request.query as any;
    
    if (!code) {
      return reply.status(400).send('Authorization code missing');
    }

    try {
      const result = await handleKakaoAuth({
        authCode: code,
        redirectUri: process.env.KAKAO_REDIRECT_URI || 'http://localhost:4000/auth/kakao/callback'
      });

      // 프론트엔드로 리디렉트 (토큰과 함께)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/auth/callback?token=${result.token}&success=${result.success}`);
    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
  });

  // 토큰 검증
  app.post('/auth/verify', async (request, reply) => {
    try {
      const { token } = request.body as any;
      if (!token) {
        return reply.status(401).send({ valid: false, error: 'Token required' });
      }

      const context = await createContext({ headers: { authorization: `Bearer ${token}` } });
      
      if (context.user) {
        return { valid: true, user: context.user };
      } else {
        return reply.status(401).send({ valid: false, error: 'Invalid token' });
      }
    } catch (error: any) {
      return reply.status(401).send({ valid: false, error: error.message });
    }
  });

  // 로그아웃
  app.post('/auth/logout', async (request, reply) => {
    return { success: true, message: 'Logged out successfully' };
  });

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
              <a href="/">홈으로 가기</a>
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
      const { unsubscribeNewsletter } = await import('./services/newsletterService');
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

  // 기본 라우트들
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
    console.log(`LinguaLetter API ready at http://localhost:${port}`);
    console.log(`GraphQL Playground: http://localhost:${port}/graphql`);
    console.log(`Auth endpoints: http://localhost:${port}/auth/*`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();