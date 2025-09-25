//로그인의 경우 보안상 rest방식이 맞기 때문에 graph 방식으로 사용하지 않음
import { FastifyInstance } from 'fastify';
import { handleGoogleAuth, handleKakaoAuth } from '../services/authService';

async function authRoutes(fastify: FastifyInstance) {
  // Google OAuth
  fastify.post('/auth/google', async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await handleGoogleAuth(body);
      return result;
    } catch (error: any) {
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  // 구글 콜백 (리디렉트용)
  fastify.get('/auth/google/callback', async (request, reply) => {
    const { code, state } = request.query as any;
    
    if (!code) {
      return reply.status(400).send('Authorization code missing');
    }

    try {
      const result = await handleGoogleAuth({
        authCode: code,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback'
      });

      // 프론트엔드로 리디렉트 (토큰과 동의서 정보 함께)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        token: result.token,
        success: result.success.toString(),
        consentsRequired: result.consents.required.toString()
      });
      return reply.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
  });

  // Kakao OAuth
  fastify.post('/auth/kakao', async (request, reply) => {
    try {
      const body = request.body as any;
      const result = await handleKakaoAuth(body);
      return result;
    } catch (error: any) {
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  // 카카오 콜백 (리디렉트용)
  fastify.get('/auth/kakao/callback', async (request, reply) => {
    const { code, state } = request.query as any;
    
    if (!code) {
      return reply.status(400).send('Authorization code missing');
    }

    try {
      const result = await handleKakaoAuth({
        authCode: code,
        redirectUri: process.env.KAKAO_REDIRECT_URI || 'http://localhost:4000/auth/kakao/callback'
      });

      // 프론트엔드로 리디렉트 (토큰과 동의서 정보 함께)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        token: result.token,
        success: result.success.toString(),
        consentsRequired: result.consents.required.toString()
      });
      return reply.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);

    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }
  });

  // 토큰 갱신
  fastify.post('/auth/refresh', async (request, reply) => {
    // JWT 리프레시 토큰 로직
  });

  // 로그아웃
  fastify.post('/auth/logout', async (request, reply) => {
    return { success: true, message: 'Logged out successfully' };
  });
}

export default authRoutes;