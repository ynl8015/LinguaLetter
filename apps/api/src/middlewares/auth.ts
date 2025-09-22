import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthPayload } from '../types';

export function verifyToken(token: string): AuthPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as AuthPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Fastify + Apollo Server 통합에 맞는 컨텍스트 생성
export async function createContext(request: any) {
  let user = null;

  try {
    // request가 객체인지 확인하고 headers 접근
    const headers = request?.headers || {};
    const authHeader = headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyToken(token);
        user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
      } catch (error) {
        console.log('Invalid token:', error);
      }
    }
  } catch (error) {
    console.log('Context creation error:', error);
  }

  return {
    user,
    prisma
  };
}

export function requireAuth(user: any) {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}