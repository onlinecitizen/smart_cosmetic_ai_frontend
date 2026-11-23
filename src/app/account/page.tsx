"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert } from "@/components/ui/States";
import { PasswordField } from "@/components/ui/PasswordField";
import { ApiError, errorMessage, setCsrfToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadJson, privacyApi } from "@/lib/privacy";

function AccountPanel() {
  const { user } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [consentBusy, setConsentBusy] = useState(false);
  const [consentMsg, setConsentMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      downloadJson(await privacyApi.exportMyData(), "smart-cosmetic-ai-my-data.json");
    } catch (err) {
      setExportError(errorMessage(err, "We couldn’t prepare your data. Please try again."));
    } finally {
      setExporting(false);
    }
  }

  async function withdrawConsent() {
    setConsentBusy(true);
    setConsentMsg(null);
    try {
      await privacyApi.setFacialConsent(false);
      setConsentMsg({
        tone: "success",
        text: "Consent withdrawn. We won’t analyse any new photo unless you agree again when you start a new assessment.",
      });
    } catch (err) {
      setConsentMsg({ tone: "error", text: errorMessage(err, "We couldn’t record that. Please try again.") });
    } finally {
      setConsentBusy(false);
    }
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    if (!password || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await privacyApi.deleteAccount(password);
      setCsrfToken(null);
      // A full page load clears all signed-in state at once. Updating the auth
      // context first would make this page redirect to the login screen.
      window.location.assign("/?account=deleted");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && typeof err.detail === "string" && err.detail.includes("password")) {
        setDeleteError("That password isn’t correct.");
      } else if (err instanceof ApiError && (err.status === 409 || err.status === 429) && typeof err.detail === "string") {
        setDeleteError(err.detail);
      } else {
        setDeleteError(errorMessage(err, "We couldn’t delete your account. Please try again."));
      }
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-6">
      <p className="eyebrow">Account</p>
      <h1 className="display mt-4 text-4xl">Your account and data</h1>
      <p className="mt-3 text-sm text-brand-600">
        Signed in as <strong>{user?.email}</strong>. See the{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          privacy notice
        </Link>{" "}
        for what we store and why.
      </p>

      <section className="card mt-8 space-y-3" aria-labelledby="export-heading">
        <h2 id="export-heading" className="font-semibold text-brand-900">
          Download your data
        </h2>
        <p className="text-sm text-brand-600">
          A file with your account details, consent choices, skin scores, formulas, orders and product requests.
        </p>
        {exportError && <Alert tone="error">{exportError}</Alert>}
        <button type="button" className="btn-secondary" onClick={exportData} disabled={exporting}>
          {exporting ? "Preparing file…" : "Download my data"}
        </button>
      </section>

      <section className="card mt-6 space-y-3" aria-labelledby="consent-heading">
        <h2 id="consent-heading" className="font-semibold text-brand-900">
          Photo analysis consent
        </h2>
        <p className="text-sm text-brand-600">
          Photos are never stored. Withdrawing consent stops any new photo from being analysed. Scores you already have
          stay until you delete your account.
        </p>
        {consentMsg && <Alert tone={consentMsg.tone}>{consentMsg.text}</Alert>}
        <button type="button" className="btn-secondary" onClick={withdrawConsent} disabled={consentBusy}>
          {consentBusy ? "Saving…" : "Withdraw photo consent"}
        </button>
      </section>

      <section className="card mt-6 space-y-3 border-red-200" aria-labelledby="delete-heading">
        <h2 id="delete-heading" className="font-semibold text-brand-900">
          Delete your account
        </h2>
        <p className="text-sm text-brand-600">
          This removes your name, email address, skin scores and the contact details on your product requests, and signs
          you out. It can’t be undone. If an order or request is still in progress, finish or cancel it first.
        </p>
        {!confirmDelete ? (
          <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(true)}>
            Delete my account
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="space-y-4">
            <PasswordField
              id="delete-password"
              label="Enter your password to confirm"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
            {deleteError && <Alert tone="error">{deleteError}</Alert>}
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={!password || deleting}>
                {deleting ? "Deleting…" : "Permanently delete my account"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setConfirmDelete(false);
                  setPassword("");
                  setDeleteError(null);
                }}
              >
                Keep my account
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountPanel />
    </RequireAuth>
  );
}
