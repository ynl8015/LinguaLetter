import { Context } from '../types';
import { requireAuth, verifyToken } from '../middlewares/auth';
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
    me: async (_: any, __: any, { user, prisma }: Context) => {
      if (!user) {
        throw new Error('User not found or token invalid');
      }
      
      // 사용자가 실제로 DB에 존재하는지 다시 확인 (계정 삭제 후에도 토큰이 남아있을 수 있음)
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      
      if (!existingUser) {
        throw new Error('User account has been deleted');
      }
      
      // 동의서 확인 - 새로 가입한 사용자나 재가입한 사용자는 동의서가 없을 수 있음
      const userConsent = await prisma.userConsent.findFirst({
        where: { userId: user.id }
      });
      
      if (!userConsent) {
        console.log(`No consent found for user ${user.id} (${user.email}). User needs to complete consent process.`);
        // 동의서가 없는 경우는 정상적으로 사용자 정보를 반환하되, 
        // 프론트엔드에서 동의서 페이지로 리다이렉트하도록 함
      }
      
      return existingUser;
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
    },

    deleteAccount: async (_: any, __: any, { user, prisma, request }: Context) => {
      const currentUser = requireAuth(user);
      
      try {
        // 현재 토큰을 블랙리스트에 추가
        const authHeader = request?.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const decoded = verifyToken(token);
            const tokenId = `${decoded.userId}_${decoded.iat}`;
            const expiresAt = new Date((decoded.exp || 0) * 1000);
            
            await prisma.invalidatedToken.create({
              data: {
                userId: currentUser.id,
                tokenId,
                reason: 'account_deleted',
                expiresAt
              }
            });
          } catch (tokenError) {
            console.error('Token invalidation error:', tokenError);
          }
        }
        
        // Delete all related data due to cascade delete in schema
        await prisma.user.delete({
          where: { id: currentUser.id }
        });
        
        return {
          success: true,
          error: null,
          message: '계정이 성공적으로 삭제되었습니다.'
        };
      } catch (error) {
        console.error('Delete account error:', error);
        return {
          success: false,
          error: 'DELETE_FAILED',
          message: '계정 삭제 중 오류가 발생했습니다.'
        };
      }
    }
  }
};