"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  /** Destructive actions are shown in red. */
  danger?: boolean;
  /** Ask for a reason (reject, return for correction). Minimum 3 characters. */
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<void> | void;
}

/**
 * Confirmation for destructive or review actions. Focus moves into the dialog,
 * Escape cancels, and the confirm button stays disabled until a required
 * reason is given. Errors from `onConfirm` are shown inside the dialog.
 */
export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLTextAreaElement | HTMLButtonElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    setReason("");
    setError(null);
    setBusy(false);
    if (request) setTimeout(() => firstRef.current?.focus(), 0);
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, busy, onClose]);

  if (!request) return null;
  const needsReason = Boolean(request.reasonLabel);
  const reasonOk = !needsReason || reason.trim().length >= 3;

  async function confirm() {
    if (!request || !reasonOk) return;
    setBusy(true);
    setError(null);
    try {
      await request.onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn’t work. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="card w-full max-w-md space-y-4 bg-white">
        <h2 id={titleId} className="text-lg font-semibold text-brand-900">
          {request.title}
        </h2>
        <p className="text-sm text-brand-700">{request.body}</p>
        {needsReason && (
          <div className="space-y-1 text-sm">
            <label className="label" htmlFor={`${titleId}-reason`}>
              {request.reasonLabel}
            </label>
            <textarea
              id={`${titleId}-reason`}
              aria-describedby={`${titleId}-hint`}
              ref={(el) => {
                firstRef.current = el;
              }}
              className="input min-h-[5rem]"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
            <p id={`${titleId}-hint`} className="text-xs text-brand-500">
              Required. The editor sees this reason in the product history.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={busy}
            ref={(el) => {
              if (!needsReason) firstRef.current = el;
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={request.danger ? "btn-primary !bg-red-700 hover:!bg-red-800" : "btn-primary"}
            onClick={confirm}
            disabled={busy || !reasonOk}
          >
            {busy ? "Working…" : request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
