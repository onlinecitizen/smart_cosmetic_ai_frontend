import Link from "next/link";
import type { StatusTone } from "@/lib/orderStatus";

/**
 * Shared state components (DESIGN.md "States"). Every data-loading screen
 * must render exactly one of: Spinner (loading), ErrorState (failed, with a
 * retry), EmptyState (loaded, nothing to show), or its content.
 */

type AlertTone = "error" | "warning" | "success" | "info";

export function Alert({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  // Errors interrupt screen readers; everything else is announced politely.
  const role = tone === "error" ? "alert" : "status";
  return (
    <div role={role} className={`alert alert-${tone} ${className}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-3 text-sm text-brand-500">
      <span className="h-6 w-6 animate-spin rounded-full border border-brand-200 border-t-gold-700" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ErrorState({
  message,
  onRetry,
  className = "",
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Alert tone="error" className={className}>
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 font-semibold underline underline-offset-4">
          Try again
        </button>
      )}
    </Alert>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card space-y-3 text-center sm:text-left">
      <p className="font-semibold text-brand-900">{title}</p>
      {body && <p className="text-sm text-brand-500">{body}</p>}
      {action && (
        <Link href={action.href} className="btn-primary mt-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-brand-300 bg-white/70 text-brand-700",
  progress: "border-gold-500 bg-gold-100/60 text-brand-900",
  done: "border-emerald-300 bg-emerald-50 text-emerald-900",
  stopped: "border-red-200 bg-red-50 text-red-800",
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

/** Shown next to any result produced by a development (mock) provider. */
export function DemoBadge({ children = "Demonstration" }: { children?: React.ReactNode }) {
  return <span className="badge-demo">{children}</span>;
}
