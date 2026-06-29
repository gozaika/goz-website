import { useAuth } from "@/auth/useAuth";
import { usePushRegistration } from "./push";

/** Mounts push-token registration; active only while signed in. Renders nothing. */
export function PushRegistrar(): null {
  const { session } = useAuth();
  usePushRegistration(Boolean(session));
  return null;
}
