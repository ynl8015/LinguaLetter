import { Context } from '../types';
import { generateDailyNews } from '../services/newsService';

export const articleResolvers = {
  Query: {
    latestNews: async (_: any, __: any, { prisma }: Context) => {
      return await prisma.article.findFirst({
        orderBy: { createdAt: 'desc' }
      });
    },

    newsHistory: async (_: any, { limit = 10 }: { limit?: number }, { prisma }: Context) => {
      return await prisma.article.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    }
  },

  Mutation: {
    generateDailyNews: async () => {
      return await generateDailyNews();
    }
  }
};