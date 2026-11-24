"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Spinner } from "@/components/ui/States";
import { errorMessage } from "@/lib/api";
import { RetentionReport, privacyApi } from "@/lib/privacy";

/** Admin: preview, then run, the data-retention clean-up (backend docs/privacy.md §6). */
export function RetentionPanel() {
  const [preview, setPreview] = useState<RetentionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RetentionReport | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPreview(await privacyApi.retentionPreview());
    } catch (err) {
      setError(errorMessage(err, "Could not load the retention preview."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setResult(await privacyApi.retentionRun());
      setConfirming(false);
      await load();
    } catch (err) {
      setError(errorMessage(err, "The clean-up did not run."));
    } finally {
      setRunning(false);
    }
  }

  const nothingToDo =
    preview &&
    preview.order_requests_to_clear + preview.old_sessions + preview.old_reset_tokens + (preview.idle_assistant_conversations ?? 0) === 0;

  return (
    <div className="card space-y-4 text-sm text-brand-700">
      <h2 className="font-semibold text-brand-900">Data retention clean-up</h2>
      <p>
        Removes customer contact details from order requests that were closed (declined, cancelled or completed) more
        than {preview?.retention_days ?? "the configured number of"} days ago, and deletes expired sign-in records and
        old password-reset tokens and idle Beauty Assistant conversations. The requests themselves stay. Removed details can’t be recovered, except from a
        database backup. Each run is recorded in the audit log.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      {result && (
        <Alert tone="success">
          Done: contact details removed from {result.order_requests_to_clear} request(s); {result.old_sessions} sign-in
          record(s), {result.old_reset_tokens} reset token(s) and {result.idle_assistant_conversations ?? 0} idle assistant
          conversation(s) deleted.
        </Alert>
      )}
      {!preview ? (
        !error && <Spinner label="Checking what would be removed" />
      ) : (
        <>
          <ul className="list-disc pl-5">
            <li>Order requests to clear: {preview.order_requests_to_clear}</li>
            <li>Old sign-in records: {preview.old_sessions}</li>
            <li>Old password-reset tokens: {preview.old_reset_tokens}</li>
            <li>Idle assistant conversations: {preview.idle_assistant_conversations ?? 0}</li>
          </ul>
          {nothingToDo ? (
            <p className="text-brand-500">Nothing to remove right now.</p>
          ) : !confirming ? (
            <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>
              Run clean-up
            </button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-primary" onClick={run} disabled={running}>
                {running ? "Running…" : "Yes, remove this data"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
