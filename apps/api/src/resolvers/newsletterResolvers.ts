import { subscribeNewsletter, sendNewsletterToAllSubscribers } from '../services/newsletterService';

export const newsletterResolvers = {
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