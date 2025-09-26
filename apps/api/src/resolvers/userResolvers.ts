// resolvers/userResolvers.ts
import { Context } from '../types';
import { requireAuth, requireFullAuth, verifyToken } from '../middlewares/auth';
import type { User, Session, FeedbackAnalysis, UserConsent, UserStats } from '@prisma/client';

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
      return results.map((result: Session) => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    },
    feedbacks: async (parent: any, _: any, { prisma }: Context) => {
      const results = await prisma.feedbackAnalysis.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' }
      });
      return results.map((result: FeedbackAnalysis) => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    }
  },

  Query: {
    me: async (_: any, __: any, { user, tempUser, prisma }: Context) => {
      if (!user) {
        throw new Error('User not found or token invalid');
      }
      
      // 임시 토큰인 경우 제한적 정보만 반환
      if (tempUser) {
        console.log('Returning temp user info for:', user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          provider: user.provider,
          role: user.role,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
      }
      
      // 사용자가 실제로 DB에 존재하는지 다시 확인 (계정 삭제 후에도 토큰이 남아있을 수 있음)
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      
      if (!existingUser) {
        console.log('User not found in database:', user.id);
        throw new Error('User account has been deleted');
      }
      
      // 동의서 확인 - 새로 가입한 사용자나 재가입한 사용자는 동의서가 없을 수 있음
      const userConsent = await prisma.userConsent.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!userConsent) {
        console.log(`No consent found for user ${user.id} (${user.email}). User needs to complete consent process.`);
        // 동의서가 없는 경우 오류를 던져서 프론트엔드에서 재로그인하도록 유도
        throw new Error('Consent not found - please login again');
      }
      
      // 동의서 버전 확인
      const TERMS_VERSION = process.env.TERMS_VERSION || "1.0.0";
      const PRIVACY_VERSION = process.env.PRIVACY_VERSION || "1.0.0";
      
      if (!userConsent.termsAccepted || 
          !userConsent.privacyAccepted ||
          userConsent.termsVersion !== TERMS_VERSION ||
          userConsent.privacyVersion !== PRIVACY_VERSION) {
        console.log(`Consent expired for user ${user.id}. Terms: ${userConsent.termsVersion}/${TERMS_VERSION}, Privacy: ${userConsent.privacyVersion}/${PRIVACY_VERSION}`);
        throw new Error('Consent expired - please login again');
      }
      
      return {
        ...existingUser,
        createdAt: existingUser.createdAt.toISOString(),
        lastLogin: existingUser.lastLogin.toISOString()
      };
    },

    myStats: async (_: any, __: any, { user, tempUser, prisma }: Context) => {
      const currentUser = requireFullAuth(user, tempUser);
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

    mySessions: async (_: any, { limit = 10 }: { limit?: number }, { user, tempUser, prisma }: Context) => {
      const currentUser = requireFullAuth(user, tempUser);
      const results = await prisma.session.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      return results.map((result: Session) => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    },

    myFeedbacks: async (_: any, { limit = 10 }: { limit?: number }, { user, tempUser, prisma }: Context) => {
      const currentUser = requireFullAuth(user, tempUser);
      const results = await prisma.feedbackAnalysis.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      return results.map((result: FeedbackAnalysis) => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    }
  },

  Mutation: {
    submitConsent: async (_: any, { input }: any, { user, prisma }: Context) => {
      // 임시 토큰도 허용 (동의서 제출을 위해)
      const currentUser = requireAuth(user);
      
      console.log('Submitting consent for user:', currentUser.id);
      
      // 이미 동의한 사용자인지 확인
      const existingConsent = await prisma.userConsent.findFirst({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' }
      });
      
      // 최신 버전의 동의서가 이미 있는 경우 중복 제출 방지
      if (existingConsent && 
          existingConsent.termsAccepted && 
          existingConsent.privacyAccepted &&
          existingConsent.termsVersion === input.termsVersion &&
          existingConsent.privacyVersion === input.privacyVersion) {
        console.log('Consent already exists for user:', currentUser.id);
        return {
          ...existingConsent,
          createdAt: existingConsent.createdAt.toISOString()
        };
      }
      
      // 새 동의서 생성
      const result = await prisma.userConsent.create({
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
      
      console.log('Consent created for user:', currentUser.id);
      
      return {
        ...result,
        createdAt: result.createdAt.toISOString()
      };
    },

    updateMyStats: async (_: any, { messagesCount }: { messagesCount: number }, { user, tempUser, prisma }: Context) => {
      const currentUser = requireFullAuth(user, tempUser);
      
      try {
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
      } catch (error) {
        console.error('Failed to update user stats:', error);
        
        // 통계가 없는 경우 생성
        try {
          const result = await prisma.userStats.create({
            data: {
              userId: currentUser.id,
              totalSessions: 1,
              totalMessages: messagesCount,
              streakDays: 1,
              lastStudyDate: new Date()
            }
          });
          
          return {
            ...result,
            lastStudyDate: result.lastStudyDate.toISOString(),
            createdAt: result.createdAt.toISOString(),
            updatedAt: result.updatedAt.toISOString()
          };
        } catch (createError) {
          console.error('Failed to create user stats:', createError);
          throw new Error('통계 업데이트에 실패했습니다.');
        }
      }
    },

    deleteAccount: async (_: any, __: any, { user, tempUser, prisma, request }: Context) => {
      const currentUser = requireFullAuth(user, tempUser);
      
      console.log('Deleting account for user:', currentUser.id);
      
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
            console.log('Token invalidated for user:', currentUser.id);
          } catch (tokenError) {
            console.error('Token invalidation error:', tokenError);
          }
        }
        
        // 트랜잭션으로 모든 관련 데이터 삭제
        await prisma.$transaction(async (tx: any) => {
          // 1. 피드백 분석 데이터 삭제
          const deletedFeedbacks = await tx.feedbackAnalysis.deleteMany({
            where: { userId: currentUser.id }
          });
          console.log(`Deleted ${deletedFeedbacks.count} feedbacks`);

          // 2. 세션 데이터 삭제
          const deletedSessions = await tx.session.deleteMany({
            where: { userId: currentUser.id }
          });
          console.log(`Deleted ${deletedSessions.count} sessions`);

          // 3. 사용자 동의 데이터 삭제 (중요!)
          const deletedConsents = await tx.userConsent.deleteMany({
            where: { userId: currentUser.id }
          });
          console.log(`Deleted ${deletedConsents.count} consents`);

          // 4. 사용자 통계 삭제
          const deletedStats = await tx.userStats.deleteMany({
            where: { userId: currentUser.id }
          });
          console.log(`Deleted ${deletedStats.count} stats`);

          // 5. 뉴스레터 구독 해지
          const userRecord = await tx.user.findUnique({
            where: { id: currentUser.id }
          });
          
          if (userRecord?.email) {
            const updatedSubscriptions = await tx.newsletterSubscriber.updateMany({
              where: { email: userRecord.email },
              data: { isActive: false }
            });
            console.log(`Deactivated ${updatedSubscriptions.count} newsletter subscriptions`);
          }

          // 6. 최종적으로 사용자 계정 삭제
          await tx.user.delete({
            where: { id: currentUser.id }
          });
          console.log('User account deleted:', currentUser.id);
        });
        
        return {
          success: true,
          error: null,
          message: '계정이 성공적으로 삭제되었습니다. 재가입시 처음부터 동의서를 작성해야 합니다.'
        };
      } catch (error) {
        console.error('Delete account error:', error);
        
        // 구체적인 에러 메시지 제공
        let errorMessage = '계정 삭제 중 오류가 발생했습니다.';
        if (error instanceof Error) {
          if (error.message.includes('foreign key constraint')) {
            errorMessage = '관련 데이터가 있어 삭제할 수 없습니다. 관리자에게 문의하세요.';
          } else if (error.message.includes('Record to delete does not exist')) {
            errorMessage = '이미 삭제된 계정입니다.';
          }
        }
        
        return {
          success: false,
          error: 'DELETE_FAILED',
          message: errorMessage
        };
      }
    }
  }
};