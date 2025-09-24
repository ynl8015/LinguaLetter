import { Context } from '../types';
import { requireAuth } from '../middlewares/auth';
import { handleGoogleAuth } from '../services/authService';

export const userResolvers = {
  User: {
    stats: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.userStats.findUnique({
        where: { userId: parent.id }
      });
    },
    sessions: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.session.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' }
      });
    },
    feedbacks: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.feedbackAnalysis.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' }
      });
    }
  },

  Query: {
    me: async (_: any, __: any, { user }: Context) => {
      return user; // 미들웨어에서 이미 조회됨
    },

    myStats: async (_: any, __: any, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      return await prisma.userStats.findUnique({
        where: { userId: currentUser.id }
      });
    },

    mySessions: async (_: any, { limit = 10 }: { limit?: number }, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      return await prisma.session.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    },

    myFeedbacks: async (_: any, { limit = 10 }: { limit?: number }, { user, prisma }: Context) => {
      const currentUser = requireAuth(user);
      return await prisma.feedbackAnalysis.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
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
      
      return await prisma.userStats.update({
        where: { userId: currentUser.id },
        data: {
          totalSessions: { increment: 1 },
          totalMessages: { increment: messagesCount },
          lastStudyDate: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }
};