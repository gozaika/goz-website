import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { onboardingTaskUpdateSchema } from "@gozaika/types";
import { mobileResponseErr, mobileResponseOk } from "@/lib/mobile/handler";
import { withMobileRestaurantRole } from "@/lib/mobile/restaurant-auth";
import { loadOnboarding, setOnboardingTask } from "@/lib/mobile/onboarding";

/**
 * Resumable restaurant onboarding (Slice 12). GET is `viewDashboard` (any team
 * member sees progress); PATCH a task is `manageProfile` (OWNER/ADMIN). Step
 * completion is derived from real data; task transitions are server-authoritative
 * so progress resumes across sessions. Scoped to the selected restaurant.
 */

export const GET = withMobileRestaurantRole("viewDashboard", async ({ membership, requestId, restaurantPk }) => {
  const service = createServiceRoleSupabaseClient();
  const canManage = membership.roleCode === "OWNER" || membership.roleCode === "ADMIN";
  const data = await loadOnboarding(service, restaurantPk, membership.restaurantName, membership.restaurantStatusCode, canManage);
  if (!data) return mobileResponseErr("NOT_FOUND", "Restaurant onboarding is unavailable.", requestId);
  return mobileResponseOk(data, requestId);
});

export async function PATCH(req: Request) {
  return withMobileRestaurantRole("manageProfile", async ({ actor, membership, requestId, restaurantPk }) => {
    const parsed = onboardingTaskUpdateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return mobileResponseErr("VALIDATION", parsed.error.issues[0]?.message ?? "Check the task details.", requestId, {
        fieldErrors: parsed.error.issues.map((issue) => ({ field: String(issue.path[0] ?? "taskCode"), message: issue.message })),
      });
    }

    const service = createServiceRoleSupabaseClient();
    const result = await setOnboardingTask(service, restaurantPk, parsed.data.taskCode, parsed.data.statusCode, actor.profilePk);
    if (!result.ok) {
      return mobileResponseErr(result.code, result.message, requestId);
    }

    const data = await loadOnboarding(service, restaurantPk, membership.restaurantName, membership.restaurantStatusCode, true);
    if (!data) return mobileResponseErr("NOT_FOUND", "Restaurant onboarding is unavailable.", requestId);
    return mobileResponseOk(data, requestId);
  })(req);
}
