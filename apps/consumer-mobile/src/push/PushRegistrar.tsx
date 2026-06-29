import { useAuth } from "@/auth/useAuth";
import { useNotificationDeepLinks, usePushRegistration } from "./push";

/** Mounts push-token registration + notification deep-link routing. Renders nothing. */
export function PushRegistrar(): null {
  const { session } = useAuth();
  usePushRegistration(Boolean(session));
  useNotificationDeepLinks();
  return null;
}
