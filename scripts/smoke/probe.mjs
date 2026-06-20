import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.argv[2];

console.log("url:", url, "anon set:", !!anon, "svc set:", !!svc);

const authed = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
const u = await authed.auth.getUser(token);
console.log("getUser -> error:", u.error?.message ?? "none", "| user:", u.data?.user?.id ?? "null");

if (u.data?.user) {
  const svcc = createClient(url, svc, { auth: { persistSession: false } });
  const p = await svcc
    .from("iam_profile")
    .select("iam_profile_pk,is_restaurant_user")
    .eq("auth_user_fk", u.data.user.id)
    .maybeSingle();
  console.log("profile -> error:", p.error?.message ?? "none", "| row:", JSON.stringify(p.data));
}
