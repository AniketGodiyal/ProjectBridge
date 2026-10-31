import { z } from 'zod';

export const projectPlanSchema = z.object({
  project_title: z.string(),
  project_summary: z.string(),
  assumptions: z.array(z.string()).default([]),
  clarification_questions: z.array(z.string()).default([]),
  requirements: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      quantity: z.number().min(1).default(1),
      importance: z.enum(['essential', 'optional']).default('optional'),
      purpose: z.string(),
      specifications: z.array(z.string()).default([]),
      estimated_cost_inr: z.object({ min: z.number(), max: z.number() }).optional(),
      safety_notes: z.array(z.string()).default([]),
      alternatives: z.array(z.string()).default([]),
      confidence: z.enum(['low', 'medium', 'high']).default('medium'),
    })
  ).default([]),
  software_requirements: z.array(z.string()).default([]),
  skills_and_training: z.array(z.string()).default([]),
  estimated_total_budget_inr: z.object({ min: z.number(), max: z.number() }).optional(),
  limitations: z.array(z.string()).default([]),
});

export type ValidatedProjectPlan = z.infer<typeof projectPlanSchema>;

export function validatePlan(data: unknown): ValidatedProjectPlan | null {
  const result = projectPlanSchema.safeParse(data);
  if (!result.success) return null;
  return result.data;
}
