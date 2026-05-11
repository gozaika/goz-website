"use client";

import { Button, GoZaikaLogo } from "@gozaika/ui";
import { safeErrorMessage } from "@gozaika/utils";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin.ops@gozaika.example");
  const [password, setPassword] = useState("GozaikaDemo@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      router.replace("/admin/restaurants/onboarding");
      router.refresh();
    } catch (caught) {
      setError(safeErrorMessage(caught, "Admin login failed. Seed the local admin user and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-md place-items-center px-4 py-10">
      <div className="w-full rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <GoZaikaLogo className="h-11" />
        <div className="mt-6 flex items-center gap-3">
          <LockKeyhole className="text-[#1A5C38]" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">Admin access</h1>
            <p className="text-sm text-black/60">Restricted operations portal.</p>
          </div>
        </div>
        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 grid gap-3">
          <input className="min-h-11 rounded-lg border border-black/20 px-3" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Admin email" />
          <input className="min-h-11 rounded-lg border border-black/20 px-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} aria-label="Admin password" />
          <Button onClick={login} disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
        </div>
      </div>
    </section>
  );
}
