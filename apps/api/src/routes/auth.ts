// routes/auth.ts
import { FastifyInstance } from 'fastify';
import { handleGoogleAuth, handleKakaoAuth, completeRegistrationAfterConsent, refreshAccessToken } from '../services/authService';
import prisma from '../db';
import jwt from 'jsonwebtoken';

async function authRoutes(fastify: FastifyInstance) {
  // Google OAuth - 회원가입/로그인
  fastify.post('/auth/google', async (request, reply) => {
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
      
      // 쿠키에 refresh token 설정 (httpOnly, secure)
      reply.setCookie('refreshToken', result.refreshToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
      });
      
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

  // Kakao OAuth - 회원가입/로그인
  fastify.post('/auth/kakao', async (request, reply) => {
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
      
      reply.setCookie('refreshToken', result.refreshToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
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

  // 구글 콜백 (리디렉트용)
  fastify.get('/auth/google/callback', async (request, reply) => {
    const { code, state } = request.query as any;
    
    if (!code) {
      return reply.status(400).send('Authorization code missing');
    }

    try {
      // Google OAuth 처리 로직 (기존과 동일하지만 새로운 상태 처리)
      const result = await handleGoogleAuth({
        authCode: code,
        redirectUri: process.env.GOOGLE_REDIRECT_URI! || 'http://localhost:4000/auth/google/callback'
      } as any);

      const frontendUrl = process.env.FRONTEND_URL! || 'http://localhost:3000';
      
      if (result.status === 'CONSENT_REQUIRED') {
        const params = new URLSearchParams({
          token: result.token,
          status: 'CONSENT_REQUIRED',
          success: result.success.toString()
        });
        return reply.redirect(`${frontendUrl}/login?kakao_consent=true&token=${result.token}&status=CONSENT_REQUIRED`);
      }
      
      // 성공한 경우 refresh token 쿠키 설정
      reply.setCookie('refreshToken', result.refreshToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      const params = new URLSearchParams({
        token: result.token,
        status: 'SUCCESS',
        success: result.success.toString()
      });
      return reply.redirect(`${frontendUrl}/login?token=${result.token}&status=SUCCESS`);
    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL! || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message)}`);
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
        redirectUri: process.env.KAKAO_REDIRECT_URI! || (process.env.NODE_ENV === 'production' 
          ? 'https://lingualetterapi-production.up.railway.app/auth/kakao/callback' 
          : 'http://localhost:4000/auth/kakao/callback')
      });

      const frontendUrl = process.env.FRONTEND_URL! || 'http://localhost:3000';
      
      if (result.status === 'CONSENT_REQUIRED') {
        const params = new URLSearchParams({
          token: result.token,
          status: 'CONSENT_REQUIRED',
          success: result.success.toString()
        });
        return reply.redirect(`${frontendUrl}/login?kakao_consent=true&token=${result.token}&status=CONSENT_REQUIRED`);
      }
      
      reply.setCookie('refreshToken', result.refreshToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      const params = new URLSearchParams({
        token: result.token,
        status: 'SUCCESS',
        success: result.success.toString()
      });
      return reply.redirect(`${frontendUrl}/login?token=${result.token}&status=SUCCESS`);

    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL! || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error.message)}`);
    }
  });

  // 동의서 완료 후 정식 로그인
  fastify.post('/auth/complete-registration', async (request, reply) => {
    try {
      const body = request.body as any;
      const { tempToken } = body;
      
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
      
      const result = await completeRegistrationAfterConsent(decoded.userId);
      
      // 쿠키에 refresh token 설정
      reply.setCookie('refreshToken', result.refreshToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      return {
        success: true,
        token: result.token,
        user: result.user,
        message: '회원가입이 완료되었습니다.'
      };
    } catch (error: any) {
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  // 토큰 갱신
  fastify.post('/auth/refresh', async (request, reply) => {
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
  fastify.post('/auth/verify', async (request, reply) => {
    try {
      const { token } = request.body as any;
      if (!token) {
        return reply.status(401).send({ valid: false, error: 'Token required' });
      }

      const { verifyAuthToken } = await import('../services/authService');
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

  // 로그아웃
  fastify.post('/auth/logout', async (request, reply) => {
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

  // 계정 상태 확인 (동의서 상태 포함)
  fastify.get('/auth/status', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authenticated: false, status: 'UNAUTHENTICATED' };
      }

      const token = authHeader.substring(7);
      const { verifyAuthToken } = await import('../services/authService');
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
}

export default authRoutes;