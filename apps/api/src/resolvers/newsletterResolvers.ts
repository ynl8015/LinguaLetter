import { subscribeNewsletter } from '../services/newsletterService';

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
    }
  }
};