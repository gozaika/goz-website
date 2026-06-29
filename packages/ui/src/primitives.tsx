import type { CSSProperties, ElementType, ReactNode } from "react";
import type { StatusTone } from "@gozaika/design-tokens";
import { cn } from "@gozaika/utils";

// Web base primitives for the design system (W1). Token-driven via the Tailwind
// utilities defined in theme.css — no raw brand-hex. These mirror the
// @gozaika/mobile-ui primitives (Card/Text/Badge/Skeleton/ErrorState) so the two
// surfaces share one component vocabulary.

export type Elevation = "none" | "sm" | "md" | "lg";

const ELEVATION: Record<Elevation, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

export function Card({
  children,
  elevated = "sm",
  className,
  style,
}: {
  readonly children: ReactNode;
  readonly elevated?: Elevation;
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  return (
    <div className={cn("rounded-lg border border-hairline bg-white p-5", ELEVATION[elevated], className)} style={style}>
      {children}
    </div>
  );
}

export type TextVariant = "display" | "title" | "heading" | "body" | "label" | "caption";

const TEXT_VARIANT: Record<TextVariant, string> = {
  display: "text-4xl font-extrabold leading-tight text-charcoal",
  title: "text-2xl font-bold leading-tight text-charcoal",
  heading: "text-lg font-semibold text-charcoal",
  body: "text-base text-charcoal",
  label: "text-sm font-semibold text-charcoal",
  caption: "text-xs font-medium text-muted",
};

export function Text({
  children,
  variant = "body",
  as,
  className,
}: {
  readonly children: ReactNode;
  readonly variant?: TextVariant;
  readonly as?: ElementType;
  readonly className?: string;
}) {
  const Tag = as ?? (variant === "display" || variant === "title" ? "h1" : variant === "heading" ? "h2" : "p");
  return <Tag className={cn(TEXT_VARIANT[variant], className)}>{children}</Tag>;
}

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-hairline text-charcoal",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  readonly children: ReactNode;
  readonly tone?: StatusTone;
  readonly className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", TONE_CLASS[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Loading placeholder. The pulse animation is disabled under
 * `prefers-reduced-motion` (motion-reduce:animate-none) — parity with the mobile
 * Skeleton's `useReducedMotion()` handling.
 */
export function Skeleton({ className }: { readonly className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-hairline motion-reduce:animate-none", className)} />;
}

export function ErrorState({
  title,
  body,
  action,
}: {
  readonly title: string;
  readonly body: string;
  readonly action?: ReactNode;
}) {
  return (
    <section role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-8 text-center">
      <p className="text-lg font-semibold text-danger">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-charcoal/80">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
