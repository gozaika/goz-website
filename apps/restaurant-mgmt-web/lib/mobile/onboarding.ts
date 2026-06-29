import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingStep, OnboardingTask, RestaurantOnboardingData } from "@gozaika/types";
import { loadRestaurantProfile } from "./profile";

/**
 * Resumable onboarding state (Slice 12). Every step's `done` flag is derived from
 * **real** rows — profile basics, the location pin, pickup instructions, uploaded
 * compliance documents, the first BAM Bag template, and the first drop — so the
 * wizard reflects true progress and resumes where the partner left off. The
 * `restaurant_onboarding_task` rows are returned verbatim for the manual-ack tasks.
 * Service-role read; the caller has already authorized the restaurant.
 */

async function countFor(service: SupabaseClient, table: string, restaurantPk: string): Promise<number> {
  const { count } = await service.from(table).select("*", { count: "exact", head: true }).eq("restaurant_fk", restaurantPk);
  return count ?? 0;
}

export async function loadOnboarding(
  service: SupabaseClient,
  restaurantPk: string,
  restaurantName: string,
  statusCode: string,
  canManage: boolean,
): Promise<RestaurantOnboardingData | null> {
  const [profile, documentCount, templateCount, dropCount, tasksRes] = await Promise.all([
    loadRestaurantProfile(service, restaurantPk, canManage),
    countFor(service, "restaurant_document", restaurantPk),
    countFor(service, "catalog_bag_template", restaurantPk),
    countFor(service, "drop_drop", restaurantPk),
    service
      .from("restaurant_onboarding_task")
      .select("task_code,task_name,task_status_code,completed_at")
      .eq("restaurant_fk", restaurantPk)
      .order("created_at"),
  ]);

  if (!profile) return null;

  const basicsDone = Boolean(profile.primaryContactEmail) && Boolean(profile.neighborhoodPk);
  const locationDone = profile.latitude !== null && profile.longitude !== null;
  const pickupDone = Boolean(profile.pickupInstructions && profile.pickupInstructions.trim().length > 0);

  const steps: OnboardingStep[] = [
    { key: "BASICS", title: "Restaurant basics", detail: "Name, contact and neighbourhood.", done: basicsDone, manual: false, routePath: "/profile" },
    { key: "LOCATION", title: "Pickup location pin", detail: "Drop a map pin so customers can find you.", done: locationDone, manual: false, routePath: "/profile" },
    { key: "PICKUP", title: "Pickup instructions", detail: "Tell customers how to collect their order.", done: pickupDone, manual: false, routePath: "/profile" },
    { key: "COMPLIANCE", title: "Compliance documents", detail: "Upload FSSAI and tax documents.", done: documentCount > 0, manual: false, routePath: "/compliance" },
    { key: "FIRST_TEMPLATE", title: "Create a BAM Bag template", detail: "Set up your first bag template.", done: templateCount > 0, manual: false, routePath: "/templates" },
    { key: "FIRST_DROP", title: "Publish your first drop", detail: "Go live with a Limited Drop.", done: dropCount > 0, manual: false, routePath: "/drops/new" },
  ];

  const tasks: OnboardingTask[] = ((tasksRes.data ?? []) as {
    task_code: string;
    task_name: string;
    task_status_code: string;
    completed_at: string | null;
  }[]).map((row) => ({
    taskCode: row.task_code,
    taskName: row.task_name,
    statusCode: row.task_status_code,
    completedAt: row.completed_at,
  }));

  return {
    restaurantPk,
    restaurantName,
    statusCode,
    steps,
    tasks,
    completedSteps: steps.filter((s) => s.done).length,
    totalSteps: steps.length,
    canManage,
  };
}

export type SetTaskResult = { readonly ok: true } | { readonly ok: false; readonly code: "NOT_FOUND" | "SERVER_ERROR"; readonly message: string };

/** Transition a manual-ack onboarding task. Scoped by restaurant + task_code (the
 *  unique key), so a partner can only touch their own restaurant's tasks. */
export async function setOnboardingTask(
  service: SupabaseClient,
  restaurantPk: string,
  taskCode: string,
  statusCode: "PENDING" | "IN_PROGRESS" | "COMPLETED",
  profilePk: string,
): Promise<SetTaskResult> {
  const { data: existing } = await service
    .from("restaurant_onboarding_task")
    .select("restaurant_onboarding_task_pk")
    .eq("restaurant_fk", restaurantPk)
    .eq("task_code", taskCode)
    .maybeSingle();
  if (!existing) return { ok: false, code: "NOT_FOUND", message: "That onboarding task does not exist." };

  const now = new Date().toISOString();
  const completed = statusCode === "COMPLETED";
  const { error } = await service
    .from("restaurant_onboarding_task")
    .update({
      task_status_code: statusCode,
      completed_at: completed ? now : null,
      completed_by_profile_fk: completed ? profilePk : null,
      updated_at: now,
    })
    .eq("restaurant_fk", restaurantPk)
    .eq("task_code", taskCode);
  if (error) {
    console.error("mobile_onboarding_task_update_failed", { code: error.code });
    return { ok: false, code: "SERVER_ERROR", message: "Could not update the task." };
  }
  return { ok: true };
}
