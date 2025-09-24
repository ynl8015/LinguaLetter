import { Context } from '../types';
import { requireAuth } from '../middlewares/auth';
import { handleGoogleAuth } from '../services/authService';

export const userResolvers = {
  User: {
    stats: async (parent: any, _: any, { prisma }: Context) => {
      const result = await prisma.userStats.findUnique({
        where: { userId: parent.id }
      });
      if (result) {
        return {
          ...result,
          lastStudyDate: result.lastStudyDate ? result.lastStudyDate.toISOString() : null,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString()
        };
      }
      return result;
    },
    sessions: async (parent: any, _: any, { prisma }: Context) => {
      const results = await prisma.session.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' }
      });
      return results.map(result => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    },
    feedbacks: async (parent: any, _: any, { prisma }: Context) => {
      const results = await prisma.feedbackAnalysis.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' }
      });
      return results.map(result => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    }
  },

  Query: {
    me: async (_: any, __: any, { user }: Context) => {
      return user; // 미들웨어에서 이미 조회됨
    },

    myStats: async (_: any, __: any, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      const result = await prisma.userStats.findUnique({
        where: { userId: currentUser.id }
      });
      if (result) {
        return {
          ...result,
          lastStudyDate: result.lastStudyDate ? result.lastStudyDate.toISOString() : null,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString()
        };
      }
      return result;
    },

    mySessions: async (_: any, { limit = 10 }: { limit?: number }, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      const results = await prisma.session.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      return results.map(result => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    },

    myFeedbacks: async (_: any, { limit = 10 }: { limit?: number }, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      const results = await prisma.feedbackAnalysis.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      return results.map(result => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    }
  },

  Mutation: {

    submitConsent: async (_: any, { input }: any, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      
      return await prisma.userConsent.create({
        data: {
          userId: currentUser.id,
          termsAccepted: input.termsAccepted,
          privacyAccepted: input.privacyAccepted,
          newsletterOptIn: input.newsletterOptIn,
          termsVersion: input.termsVersion,
          privacyVersion: input.privacyVersion,
          newsletterVersion: input.newsletterVersion
        }
      });
    },

    updateMyStats: async (_: any, { messagesCount }: { messagesCount: number }, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      
      const result = await prisma.userStats.update({
        where: { userId: currentUser.id },
        data: {
          totalSessions: { increment: 1 },
          totalMessages: { increment: messagesCount },
          lastStudyDate: new Date(),
          updatedAt: new Date()
        }
      });
      
      return {
        ...result,
        lastStudyDate: result.lastStudyDate ? result.lastStudyDate.toISOString() : null,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString()
      };
    }
  }
};