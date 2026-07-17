import { ObjectType, Field, ID, Float, Int, registerEnumType, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

// ── Enums ────────────────────────────────────────────────────────────────

/** GraphQL enum for user roles */
export enum GqlUserRole {
  ADMIN = 'ADMIN',
  EMPLOYER = 'EMPLOYER',
  JOB_SEEKER = 'JOB_SEEKER',
  FREELANCER = 'FREELANCER',
}

/** GraphQL enum for job types */
export enum GqlJobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
  CONTRACT = 'CONTRACT',
}

/** GraphQL enum for job status */
export enum GqlJobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

/** GraphQL enum for application status */
export enum GqlApplicationStatus {
  SUBMITTED = 'SUBMITTED',
  SCREENING = 'SCREENING',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  OFFERED = 'OFFERED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

registerEnumType(GqlUserRole, { name: 'GqlUserRole', description: 'User roles on the platform' });
registerEnumType(GqlJobType, { name: 'GqlJobType', description: 'Types of employment' });
registerEnumType(GqlJobStatus, { name: 'GqlJobStatus', description: 'Job listing statuses' });
registerEnumType(GqlApplicationStatus, { name: 'GqlApplicationStatus', description: 'Application statuses' });

// ── Object Types ─────────────────────────────────────────────────────────

/** GraphQL type for User */
@ObjectType({ description: 'Platform user (employer, job seeker, freelancer, or admin)' })
export class GqlUser {
  @Field(() => ID) id!: string;
  @Field() email!: string;
  @Field() firstName!: string;
  @Field() lastName!: string;
  @Field(() => GqlUserRole) role!: GqlUserRole;
  @Field({ nullable: true }) avatarUrl?: string | null;
  @Field({ nullable: true }) phone?: string | null;
  @Field({ nullable: true }) headline?: string | null;
  @Field({ nullable: true }) bio?: string | null;
  @Field({ nullable: true }) location?: string | null;
  @Field(() => [String], { nullable: true }) skills?: string[];
  @Field({ nullable: true }) githubUrl?: string | null;
  @Field({ nullable: true }) linkedinUrl?: string | null;
  @Field({ nullable: true }) portfolioUrl?: string | null;
  @Field() isActive!: boolean;
  @Field() emailVerified!: boolean;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
}

/** GraphQL type for Company */
@ObjectType({ description: 'Employer company profile' })
export class GqlCompany {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field({ nullable: true }) description?: string | null;
  @Field({ nullable: true }) logoUrl?: string | null;
  @Field({ nullable: true }) website?: string | null;
  @Field({ nullable: true }) industry?: string | null;
  @Field({ nullable: true }) size?: string | null;
  @Field() verified!: boolean;
  @Field({ nullable: true }) location?: string | null;
  @Field() createdAt!: Date;
  @Field({ nullable: true }) userId?: string;
}

/** GraphQL type for JobCategory */
@ObjectType({ description: 'Job category' })
export class GqlJobCategory {
  @Field(() => ID) id!: string;
  @Field() slug!: string;
  @Field() label!: string;
  @Field({ nullable: true }) icon?: string | null;
}

/** GraphQL type for Job listing */
@ObjectType({ description: 'Job listing on the platform' })
export class GqlJob {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field() description!: string;
  @Field({ nullable: true }) requirements?: string | null;
  @Field() location!: string;
  @Field(() => GqlJobType) type!: GqlJobType;
  @Field() categoryId!: string;
  @Field(() => Int, { nullable: true }) salaryMin?: number | null;
  @Field(() => Int, { nullable: true }) salaryMax?: number | null;
  @Field({ nullable: true }) currency?: string;
  @Field({ nullable: true }) deadline?: Date | null;
  @Field(() => GqlJobStatus) status!: GqlJobStatus;
  @Field() featured!: boolean;
  @Field() companyId!: string;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
  @Field({ nullable: true }) experienceLevel?: string | null;
  @Field({ nullable: true }) qualification?: string | null;
  @Field({ nullable: true }) salaryType?: string | null;
  @Field(() => [String], { nullable: true }) tags?: string[];
  @Field() urgent!: boolean;
  @Field(() => Int, { nullable: true }) vacancies?: number | null;
  @Field({ nullable: true }) yearsOfExperience?: string | null;

  // Resolved fields (populated by DataLoaders)
  @Field(() => GqlCompany, { nullable: true }) company?: GqlCompany;
  @Field(() => GqlJobCategory, { nullable: true }) category?: GqlJobCategory;
  @Field(() => Int, { nullable: true, description: 'Total applications count' }) applicationCount?: number;
}

/** GraphQL type for Application */
@ObjectType({ description: 'Job application' })
export class GqlApplication {
  @Field(() => ID) id!: string;
  @Field() jobId!: string;
  @Field() userId!: string;
  @Field({ nullable: true }) coverLetter?: string | null;
  @Field({ nullable: true }) resumeUrl?: string | null;
  @Field(() => GqlApplicationStatus) status!: GqlApplicationStatus;
  @Field({ nullable: true }) interviewSlot?: Date | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
  @Field(() => Int, { nullable: true }) expectedSalary?: number | null;
  @Field({ nullable: true }) portfolioUrl?: string | null;

  // Resolved fields
  @Field(() => GqlJob, { nullable: true }) job?: GqlJob;
  @Field(() => GqlUser, { nullable: true }) user?: GqlUser;
}

/** GraphQL type for FreelanceJob */
@ObjectType({ description: 'Freelance job listing' })
export class GqlFreelanceJob {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field() description!: string;
  @Field() categoryId!: string;
  @Field() clientId!: string;
  @Field(() => Int) budgetMin!: number;
  @Field(() => Int) budgetMax!: number;
  @Field({ nullable: true }) currency?: string;
  @Field({ nullable: true }) pricingType?: string;
  @Field() deadlineDays!: number;
  @Field(() => [String]) skills!: string[];
  @Field({ nullable: true }) status?: string;
  @Field() featured!: boolean;
  @Field() createdAt!: Date;
  @Field(() => Int, { nullable: true, description: 'Number of bids' }) bidCount?: number;
}

/** Paginated job results */
@ObjectType({ description: 'Paginated job listing results' })
export class GqlJobConnection {
  @Field(() => [GqlJob]) jobs!: GqlJob[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
  @Field(() => Int) totalPages!: number;
  @Field() hasNextPage!: boolean;
}

/** Paginated application results */
@ObjectType({ description: 'Paginated application results' })
export class GqlApplicationConnection {
  @Field(() => [GqlApplication]) applications!: GqlApplication[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
}

// ── Input Types ──────────────────────────────────────────────────────────

/** Input for filtering/searching jobs */
@InputType({ description: 'Job search and filter parameters' })
export class GqlJobFilterInput {
  @Field({ nullable: true }) search?: string;
  @Field({ nullable: true }) location?: string;
  @Field(() => GqlJobType, { nullable: true }) type?: GqlJobType;
  @Field(() => GqlJobStatus, { nullable: true }) status?: GqlJobStatus;
  @Field(() => Int, { nullable: true }) salaryMin?: number;
  @Field(() => Int, { nullable: true }) salaryMax?: number;
  @Field({ nullable: true }) categoryId?: string;
  @Field({ nullable: true }) companyId?: string;
  @Field({ nullable: true }) featured?: boolean;
  @Field(() => Int, { nullable: true, description: 'Page number (1-indexed)' }) page?: number;
  @Field(() => Int, { nullable: true, description: 'Items per page (max 100)' }) limit?: number;
}

/** Input for filtering applications */
@InputType({ description: 'Application filter parameters' })
export class GqlApplicationFilterInput {
  @Field(() => GqlApplicationStatus, { nullable: true }) status?: GqlApplicationStatus;
  @Field({ nullable: true }) jobId?: string;
  @Field({ nullable: true }) userId?: string;
  @Field(() => Int, { nullable: true }) page?: number;
  @Field(() => Int, { nullable: true }) limit?: number;
}

/** Dashboard analytics summary */
@ObjectType({ description: 'Platform analytics dashboard summary' })
export class GqlAnalyticsSummary {
  @Field(() => Int) totalUsers!: number;
  @Field(() => Int) totalJobs!: number;
  @Field(() => Int) totalApplications!: number;
  @Field(() => Int) activeJobs!: number;
  @Field(() => Int) totalCompanies!: number;
  @Field(() => Float) averageApplicationsPerJob!: number;
}
