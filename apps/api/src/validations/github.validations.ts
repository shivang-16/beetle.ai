import { z } from 'zod';

// Schema for GitHub account
export const githubAccountSchema = z.object({
  login: z.string().optional(),
  id: z.number(),
  type: z.enum(['User', 'Organization']),
  avatar_url: z.string().optional(),
  html_url: z.string().optional(),
  slug: z.string().optional()
});

// Schema for GitHub repository
export const githubRepositorySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  private: z.boolean()
});

// Schema for GitHub installation
export const githubInstallationSchema = z.object({
  id: z.number(),
  account: githubAccountSchema,
  target_type: z.enum(['User', 'Organization']),
  repository_selection: z.enum(['all', 'selected']),
  permissions: z.record(z.string(), z.string()),
  events: z.array(z.string()),
  created_at: z.string().datetime()
});

// Schema for the complete installation payload
export const installationPayloadSchema = z.object({
  action: z.enum(['created', 'deleted']),
  installation: githubInstallationSchema,
  repositories: z.array(githubRepositorySchema).optional(),
  sender: z.object({
    login: z.string(),
    id: z.number()
  })
});

// Schema for the API request to create an installation
export const createInstallationSchema = z.object({
  installationId: z.number(),
  account: z.object({
    login: z.string(),
    id: z.number(),
    type: z.enum(['User', 'Organization']),
    avatarUrl: z.string().optional(),
    htmlUrl: z.string().optional()
  }),
  targetType: z.enum(['User', 'Organization']),
  repositorySelection: z.enum(['all', 'selected']),
  repositories: z.array(
    z.object({
      id: z.number(),
      fullName: z.string(),
      private: z.boolean()
    })
  ).optional(),
  permissions: z.record(z.string(), z.string()),
  events: z.array(z.string()),
  installedAt: z.date()
});

export type CreateInstallationInput = z.infer<typeof createInstallationSchema>;
