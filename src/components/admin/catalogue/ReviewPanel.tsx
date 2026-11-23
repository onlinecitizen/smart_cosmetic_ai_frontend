"use client";

import { adminCatalogApi, adminError, AdminIdentity, describeEvent, ReviewEvent } from "@/lib/adminCatalog";
import { ConfirmRequest } from "./ConfirmDialog";
import { CatalogStatus, formatWhen, ReadinessList } from "./shared";

type Action = "submit" | "publish" | "reject" | "return" | "archive" | "restore";

interface ActionSpec {
  action: Action;
  label: string;
  danger?: boolean;
  primary?: boolean;
}

/** Which review actions a product in each status offers (mirrors the server's transitions). */
export function actionsFor(status: string): ActionSpec[] {
  switch (status) {
    case "DRAFT":
      return [
        { action: "submit", label: "Submit for review", primary: true },
        { action: "publish", label: "Publish now (details checked)" },
        { action: "reject", label: "Reject", danger: true },
        { action: "archive", label: "Archive", danger: true },
      ];
    case "PENDING_REVIEW":
      return [
        { action: "publish", label: "Approve and publish", primary: true },
        { action: "return", label: "Return for correction" },
        { action: "reject", label: "Reject", danger: true },
        { action: "archive", label: "Archive", danger: true },
      ];
    case "REJECTED":
      return [
        { action: "submit", label: "Submit for review again", primary: true },
        { action: "archive", label: "Archive", danger: true },
      ];
    case "PUBLISHED":
      return [{ action: "archive", label: "Archive (remove from the shop)", danger: true }];
    case "ARCHIVED":
      return [{ action: "restore", label: "Restore as draft", primary: true }];
    default:
      return [];
  }
}

const CONFIRM: Record<Action, { title: string; body: string; reason?: string }> = {
  submit: { title: "Submit for review?", body: "The product goes to the review queue. You can still edit it while it waits." },
  publish: {
    title: "Publish this product?",
    body: "You confirm you have checked its details against the real label or the brand’s data. You are recorded as the reviewer. Customers see it once a shop listing is also published.",
  },
  reject: {
    title: "Reject this product?",
    body: "Rejected products are never shown to customers. Use this when the product can’t be accepted as it is (for example, it can’t be verified). The editor can correct it and submit it again.",
    reason: "Why is it rejected?",
  },
  return: {
    title: "Return for correction?",
    body: "The product goes back to draft so the editor can fix it.",
    reason: "What needs correcting?",
  },
  archive: {
    title: "Archive this product?",
    body: "It disappears from the shop and from recommendations at once, for every shop that sells it. Order requests already made are kept. You can restore it later; it then needs publishing again.",
  },
  restore: { title: "Restore this product?", body: "It comes back as a draft and stays hidden until it is published again." },
};

export function ReviewPanel({
  identity,
  history,
  onChanged,
  confirm,
  blockedByUnsaved,
}: {
  identity: AdminIdentity;
  history: ReviewEvent[];
  onChanged: () => void;
  confirm: (r: ConfirmRequest) => void;
  blockedByUnsaved: boolean;
}) {
  const ready = identity.readiness?.can_publish ?? false;
  const lastNote = [...history]
    .reverse()
    .find((e) => e.entity_type === "identity" && (e.action === "return" || e.action === "reject"));

  function run(spec: ActionSpec) {
    const c = CONFIRM[spec.action];
    confirm({
      title: c.title,
      body: c.body,
      confirmLabel: spec.label,
      danger: spec.danger,
      reasonLabel: c.reason,
      onConfirm: async (reason) => {
        try {
          await adminCatalogApi.transition(identity.id, spec.action, reason || undefined);
        } catch (err) {
          throw new Error(adminError(err, "That action didn’t work."));
        }
        onChanged();
      },
    });
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <CatalogStatus status={identity.status} />
          {identity.reviewed_at && (
            <span className="text-sm text-brand-600">
              {identity.status === "REJECTED" ? "Rejected" : "Reviewed"} by {identity.reviewed_by_email ?? "unknown"} on{" "}
              {formatWhen(identity.reviewed_at)}
            </span>
          )}
        </div>
        {lastNote && identity.status !== "PUBLISHED" && (
          <p className="alert alert-warning text-sm">
            {lastNote.action === "return" ? "Returned for correction" : "Rejected"} by {lastNote.actor_email ?? "a reviewer"}:{" "}
            “{lastNote.note}”
          </p>
        )}
        <ReadinessList readiness={identity.readiness} />
        {blockedByUnsaved && (
          <p className="text-sm text-amber-900">Save or discard your unsaved edits before changing the review status.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {actionsFor(identity.status).map((spec) => {
            const disabled = blockedByUnsaved || (spec.action === "publish" && !ready);
            return (
              <button
                key={spec.action}
                type="button"
                className={spec.primary ? "btn-primary" : spec.danger ? "btn-secondary !text-red-700" : "btn-secondary"}
                disabled={disabled}
                title={spec.action === "publish" && !ready ? "Fix the items above first" : undefined}
                onClick={() => run(spec)}
              >
                {spec.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function HistoryPanel({ history }: { history: ReviewEvent[] }) {
  if (history.length === 0) return <p className="text-sm text-brand-600">No history yet.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {[...history].reverse().map((e) => (
        <li key={e.id} className="border-b border-brand-50 pb-2">
          <p className="font-semibold text-brand-900">{describeEvent(e)}</p>
          <p className="text-xs text-brand-600">
            {e.actor_email ?? "System"} · {formatWhen(e.created_at)}
          </p>
          {e.note && <p className="text-xs text-brand-700">“{e.note}”</p>}
        </li>
      ))}
    </ol>
  );
}
