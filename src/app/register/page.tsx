"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError, errorMessage } from "@/lib/api";
import { AuthShell, safeNextPath } from "@/components/AuthShell";
import { Alert } from "@/components/ui/States";
import { PasswordField } from "@/components/ui/PasswordField";

/** Maps backend register errors (app/routers/auth.py, app/schemas.py) to plain language. */
function registerError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "An account with this email already exists. Try logging in instead.";
    if (err.status === 422)
      return "Please check your details: use a valid email address and a password of 8 to 128 characters.";
  }
  return errorMessage(err, "Something went wrong. Please try again.");
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, fullName, password);
      router.push(safeNextPath() ?? "/dashboard");
    } catch (err) {
      setError(registerError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const [next, setNext] = useState<string | null>(null);
  useEffect(() => setNext(safeNextPath()), []);
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <AuthShell eyebrow="Begin your assessment" title="Create your account">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            aria-describedby="name-hint"
            maxLength={255}
            required
          />
          <p id="name-hint" className="mt-1.5 text-xs text-brand-500">
            Your first name is shown on your formula pages.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            aria-describedby={error ? "register-error" : undefined}
            required
          />
        </div>
        <PasswordField
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint="At least 8 characters."
          minLength={8}
          describedBy={error ? "register-error" : undefined}
        />
        {error && (
          <div id="register-error">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-brand-600">
        Already have an account?{" "}
        <Link href={loginHref} className="text-brand-900 underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
