export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'USER' | 'ADMIN';
  picture?: string;
  googleId?: string;
  provider: string;
  createdAt: Date;
  lastLogin: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Context {
  user?: User;
  tempUser?: boolean;
  prisma: any;
  request?: any;
}

export interface AuthPayload {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  googleId?: string;
  kakaoId?: string;
  provider: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export enum TeacherType {
  EMMA = 'emma',
  STEVE = 'steve'
}