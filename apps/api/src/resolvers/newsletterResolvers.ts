import { subscribeNewsletter, sendNewsletterToAllSubscribers, getUserSubscriptionStatus, unsubscribeByEmail, unsubscribeNewsletter } from '../services/newsletterService';
import { requireAuth } from '../middlewares/auth';

export const newsletterResolvers = {
  Query: {
    mySubscriptionStatus: async (_: any, __: any, { user }: any) => {
      const currentUser = requireAuth(user);
      return await getUserSubscriptionStatus(currentUser.email);
    }
  },

  Mutation: {
    subscribeNewsletter: async (_: any, { email }: { email: string }) => {
      try {
        return await subscribeNewsletter(email);
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    },

    unsubscribeNewsletter: async (_: any, { email }: { email: string }, { user }: any) => {
      try {
        // 로그인된 사용자는 본인 이메일만 해지 가능
        if (user && user.email !== email) {
          throw new Error('본인의 이메일만 구독 해지할 수 있습니다.');
        }
        return await unsubscribeByEmail(email);
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    },

    unsubscribeByToken: async (_: any, { token }: { token: string }) => {
      try {
        return await unsubscribeNewsletter(token);
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    },
    
    sendNewsletterToAllSubscribers: async (_: any, { newsId }: { newsId: string }, { user }: any) => {
      if (user?.role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      
      try {
        return await sendNewsletterToAllSubscribers(newsId);
      } catch (error: any) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
};