import { z } from "zod";

/**
 * Restaurant onboarding wizard contracts (Slice 12). The wizard is **resumable**:
 * server-authoritative `restaurant_onboarding_task` rows hold task state, and the
 * BFF derives per-step completion from real data (profile basics, location pin,
 * pickup instructions, compliance docs, first template, first drop). No fabricated
 * progress — every `done` flag is computed from actual rows.
 *
 * Permissive wire schema (status/code fields stay `z.string()`); the screen
 * normalizes unknown codes rather than hard-failing.
 */

export const onboardingTaskWireSchema = z.object({
  taskCode: z.string(),
  taskName: z.string(),
  statusCode: z.string(),
  completedAt: z.string().nullable(),
});

export const onboardingStepWireSchema = z.object({
  key: z.string(),
  title: z.string(),
  detail: z.string(),
  done: z.boolean(),
  /** Steps the restaurant cannot self-complete (e.g. admin/ops review) are flagged. */
  manual: z.boolean(),
  /** In-app route to act on the step, or null when there is no direct screen. */
  routePath: z.string().nullable(),
});

export const restaurantOnboardingDataSchema = z.object({
  restaurantPk: z.string(),
  restaurantName: z.string(),
  statusCode: z.string(),
  steps: z.array(onboardingStepWireSchema),
  tasks: z.array(onboardingTaskWireSchema),
  completedSteps: z.number(),
  totalSteps: z.number(),
  /** Whether the actor's role may transition tasks (manageProfile). */
  canManage: z.boolean(),
});
export type RestaurantOnboardingData = z.infer<typeof restaurantOnboardingDataSchema>;
export type OnboardingStep = z.infer<typeof onboardingStepWireSchema>;
export type OnboardingTask = z.infer<typeof onboardingTaskWireSchema>;

/** Resumable task transitions the wizard can request (manual-ack tasks). */
export const onboardingTaskStatusCodes = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
export const onboardingTaskUpdateSchema = z.object({
  taskCode: z.string().trim().min(1).max(80),
  statusCode: z.enum(onboardingTaskStatusCodes),
});
export type OnboardingTaskUpdateRequest = z.infer<typeof onboardingTaskUpdateSchema>;
