import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { flavourPersonalityLabel } from "@gozaika/utils";

async function getConsumerPk(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: iam } = await supabase
    .from("iam_profile")
    .select("iam_profile_pk")
    .eq("auth_user_fk", userId)
    .single();
  if (!iam) return null;
  const { data: cp } = await supabase
    .from("consumer_profile")
    .select("consumer_profile_pk, first_name")
    .eq("iam_profile_fk", iam.iam_profile_pk)
    .single();
  return cp;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const profile = await getConsumerPk(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Consumer profile not found." }, { status: 404 });
  }

  const { data: passport } = await supabase
    .from("consumer_passport_stat")
    .select("total_bags_collected, current_tier_code")
    .eq("consumer_profile_fk", profile.consumer_profile_pk)
    .maybeSingle();

  const bags = Number(passport?.total_bags_collected ?? 0);

  // Discovery score (simplified — same formula as discovery-profile)
  const { count: reviewCount } = await supabase
    .from("review_review")
    .select("review_review_pk", { count: "exact", head: true })
    .eq("consumer_profile_fk", profile.consumer_profile_pk)
    .eq("moderation_status_code", "APPROVED");

  const volumeDepth = (Math.min(bags, 30) / 30) * 20;
  const engagement = (Math.min(reviewCount ?? 0, 3) / 3) * 10;
  const score = Math.round(volumeDepth + engagement);

  const label = flavourPersonalityLabel(score);
  const firstName = (profile as { first_name?: string | null }).first_name ?? "Explorer";

  // Generate SVG share card (1080×1080)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1A5C38"/>
      <stop offset="100%" stop-color="#0F3D25"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <text x="540" y="140" font-family="sans-serif" font-size="32" fill="#D4A017" text-anchor="middle" font-weight="bold" letter-spacing="6">FLAVOUR PASSPORT · GOZAIKA · HYDERABAD</text>
  <text x="540" y="420" font-family="sans-serif" font-size="220" fill="white" text-anchor="middle" font-weight="900">${score}</text>
  <text x="540" y="520" font-family="sans-serif" font-size="48" fill="#D4A017" text-anchor="middle" font-weight="bold">${label}</text>
  <text x="540" y="620" font-family="sans-serif" font-size="36" fill="rgba(255,255,255,0.7)" text-anchor="middle">${firstName}'s cuisine journey</text>
  <text x="540" y="700" font-family="sans-serif" font-size="40" fill="white" text-anchor="middle" font-weight="700">${bags} BAM Bags claimed</text>
  <text x="540" y="980" font-family="sans-serif" font-size="28" fill="rgba(255,255,255,0.5)" text-anchor="middle">Discover yours at gozaika.in</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="gozaika-flavour-passport.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
