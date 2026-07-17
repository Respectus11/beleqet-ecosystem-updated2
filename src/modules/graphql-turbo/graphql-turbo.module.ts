import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobsResolver } from './resolvers/jobs.resolver';
import { UsersResolver } from './resolvers/users.resolver';
import { ApplicationsResolver } from './resolvers/applications.resolver';
import { AnalyticsResolver } from './resolvers/analytics.resolver';

/**
 * GraphQL Turbo module providing a high-performance GraphQL API layer
 * alongside the existing REST endpoints.
 *
 * **Architecture**:
 * - Code-first approach using NestJS decorators
 * - Apollo Server v4 as the GraphQL engine
 * - DataLoaders for N+1 query prevention
 * - Type-safe schemas generated from TypeScript decorators
 *
 * **Performance Benefits**:
 * - Clients fetch exactly the data they need (no over-fetching)
 * - DataLoaders batch DB queries for nested field resolution
 * - Single round-trip for complex queries with related data
 * - Introspection for API exploration and tooling
 *
 * **Endpoint**: `POST /graphql` (with Apollo Sandbox at `/graphql`)
 *
 * @remarks This module is designed to work alongside the REST API, not
 * replace it.  REST endpoints remain the primary API for backward
 * compatibility.  GraphQL provides an additional, more efficient data
 * fetching layer for frontend optimization.
 */
@Module({
  imports: [
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/modules/graphql-turbo/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      // Allow both REST and GraphQL to coexist
      path: 'graphql',
      // CORS is handled by the main NestJS CORS config
      context: (ctx: { req: unknown }) => ({ req: ctx.req }),
      // Enable field suggestions for development
      includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
    }),
  ],
  providers: [JobsResolver, UsersResolver, ApplicationsResolver, AnalyticsResolver],
  exports: [GraphQLModule],
})
export class GraphqlTurboModule {}
