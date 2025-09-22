import { merge } from 'lodash';
import { userResolvers } from './userResolvers';
import { articleResolvers } from './articleResolvers';
import { sessionResolvers } from './sessionResolvers';
import { newsletterResolvers } from './newsletterResolvers';

export const resolvers = merge(
  userResolvers,
  articleResolvers,
  sessionResolvers,
  newsletterResolvers
);