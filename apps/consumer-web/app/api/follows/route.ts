import { createServiceRoleSupabaseClient } from "@gozaika/supabase";
import { followToggleRequestSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveConsumerProfilePk } from "@/lib/reviews";
import { followRestaurant, unfollowRestaurant } from "@/lib/follows";

/**
 * Web favorites / follows (F1) — session-authenticated parity with the mobile
 * BFF `/api/mobile/v1/follows`. Shared logic in `lib/follows.ts`. A consumer can
 * only ever modify their own follow rows; only the aggregate `followerCount` is
 * returned.
 */

async function resolveSelf(): Promise<{ ok: true; consumerPk: string } | { ok: false; status: number; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Please sign in to follow restaurants." };
  const consumerPk = await resolveConsumerProfilePk(supabase, { authUserId: user.id });
  if (!consumerPk) return { ok: false, status: 404, error: "Consumer profile not found." };
  return { ok: true, consumerPk };
}

export async function POST(request: Request) {
  const parsed = followToggleRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Pick a valid restaurant to follow." }, { status: 400 });
  }
  const self = await resolveSelf();
  if (!self.ok) return NextResponse.json({ ok: false, error: self.error }, { status: self.status });

  const service = createServiceRoleSupabaseClient();
  const state = await followRestaurant(service, self.consumerPk, parsed.data.restaurantPk);
  return NextResponse.json({ ok: true, data: { restaurantPk: parsed.data.restaurantPk, ...state } });
}

export async function DELETE(request: Request) {
  const parsed = followToggleRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Pick a valid restaurant to unfollow." }, { status: 400 });
  }
  const self = await resolveSelf();
  if (!self.ok) return NextResponse.json({ ok: false, error: self.error }, { status: self.status });

  const service = createServiceRoleSupabaseClient();
  const state = await unfollowRestaurant(service, self.consumerPk, parsed.data.restaurantPk);
  return NextResponse.json({ ok: true, data: { restaurantPk: parsed.data.restaurantPk, ...state } });
}
