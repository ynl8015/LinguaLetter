import { Context } from '../types';
import { generateDailyNews } from '../services/newsService';

export const articleResolvers = {
  Query: {
    latestNews: async (_: any, __: any, { prisma }: Context) => {
      const result = await prisma.article.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      if (result) {
        return {
          ...result,
          createdAt: result.createdAt.toISOString()
        };
      }
      return result;
    },

    newsHistory: async (_: any, { limit = 10 }: { limit?: number }, { prisma }: Context) => {
      const results = await prisma.article.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      return results.map(result => ({
        ...result,
        createdAt: result.createdAt.toISOString()
      }));
    },
    allNews: async (_: any, { limit = 50 }: any, { user, prisma }: Context) => {
      if (user?.role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      const results = await prisma.article.findMany({
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
      
      const result = await prisma.article.create({
        data: {
          trendTopic: input.trendTopic,
          koreanArticle: input.koreanArticle,
          englishTranslation: input.englishTranslation,
          expression: input.expression,
          literalTranslation: input.literalTranslation,
          idiomaticTranslation: input.idiomaticTranslation,
          createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
          reason: input.reason
        }
      });
      
      return {
        ...result,
        createdAt: result.createdAt.toISOString()
      };
    },
    
    updateNews: async (_: any, { id, input }: any, { user, prisma }: Context) => {
      if (user?.role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }
      
      const updateData = { ...input };
      if (input.createdAt) {
        updateData.createdAt = new Date(input.createdAt);
      }
      
      const result = await prisma.article.update({
        where: { id },
        data: updateData
      });
      
      return {
        ...result,
        createdAt: result.createdAt.toISOString()
      };
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