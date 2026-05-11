export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function supabaseUrl(): string {
  return Deno.env.get("SUPABASE_URL") ?? requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

