import { Context } from '../types';
import { requireAuth } from '../middlewares/auth';
import { chatWithTeacher } from '../services/teacherService';
import { analyzeFeedback } from '../services/feedbackService';
import type { FeedbackAnalysis } from '@prisma/client';

export const sessionResolvers = {
  Session: {
    user: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId }
      });
    },
    feedbackAnalysis: async (parent: any, _: any, { prisma }: Context) => {
      const results = await prisma.feedbackAnalysis.findMany({
        where: { sessionId: parent.id }
      });
      return results.map((result: FeedbackAnalysis) => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    }
  },

  FeedbackAnalysis: {
    corrections: (parent: any) => {
      try {
        return JSON.parse(parent.corrections || '[]');
      } catch {
        return [];
      }
    },
    user: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId }
      });
    },
    session: async (parent: any, _: any, { prisma }: Context) => {
      const result = await prisma.session.findUnique({
        where: { id: parent.sessionId }
      });
      if (result) {
        return {
          ...result,
          createdAt: result.createdAt.toISOString()
        };
      }
      return result;
    }
  },

  Query: {
    sessionFeedback: async (_: any, { sessionId }: { sessionId: string }, { prisma }: Context) => {
      return await prisma.feedbackAnalysis.findFirst({
        where: { sessionId }
      });
    }
  },

  Mutation: {
    chatWithTeacher: async (_: any, { input }: any) => {
      try {
        const result = await chatWithTeacher(input);
        return {
          success: true,
          reply: result.reply
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    },

    createSession: async (_: any, { input }: any, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      
      return await prisma.session.create({
        data: {
          userId: currentUser.id,
          ...input
        }
      });
    },

    analyzeFeedback: async (_: any, { input }: any, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      
      return await analyzeFeedback({
        ...input,
        userId: currentUser.id
      });
    }
  }
};