import { ShellHeader } from "@gozaika/ui";
import { LoginForm } from "./login-form";

function safeNextPath(value: string | string[] | undefined): string | null {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  readonly searchParams?: Promise<{ readonly next?: string | string[] }>;
}) {
  const query = await searchParams;

  return (
    <main>
      <ShellHeader />
      <LoginForm nextPath={safeNextPath(query?.next)} />
    </main>
  );
}
