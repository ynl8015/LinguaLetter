import Fastify from 'fastify';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from '@as-integrations/fastify';
import dotenv from 'dotenv';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { createContext } from './middlewares/auth';
import { confirmSubscription } from './services/newsletterService';
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