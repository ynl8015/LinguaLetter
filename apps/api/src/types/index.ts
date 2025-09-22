export interface User {
  id: string;
  email: string;
  name?: string;
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
  prisma: any;
}

export interface AuthPayload {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  googleId?: string;
  provider: string;
}

export enum TeacherType {
  EMMA = 'emma',
  STEVE = 'steve'
}