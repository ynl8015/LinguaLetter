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
    },
    allNews: async (_: any, { limit = 50 }: any, { user, prisma }: Context) => {
      if (user?.role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      return await prisma.article.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    }
  },

  Mutation: {
    
    generateDailyNews: async (_: any, __: any, { user }: Context) => {
      if (user?.role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      return await generateDailyNews();
    },
    
    createNews: async (_: any, { input }: any, { user, prisma }: Context) => {
      if (user?.role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      
      return await prisma.article.create({
        data: {
          trendTopic: input.trendTopic,
          koreanArticle: input.koreanArticle,
          englishTranslation: input.englishTranslation,
          expression: input.expression,
          literalTranslation: input.literalTranslation,
          idiomaticTranslation: input.idiomaticTranslation,
          reason: input.reason
        }
      });
    },
    
    updateNews: async (_: any, { id, input }: any, { user, prisma }: Context) => {
      if (user?.role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      
      return await prisma.article.update({
        where: { id },
        data: input
      });
    },
    
    deleteNews: async (_: any, { id }: any, { user, prisma }: Context) => {
      if (user?.role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      
      await prisma.article.delete({ where: { id } });
      return { success: true };
    }
  }
};