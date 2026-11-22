"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError, errorMessage } from "@/lib/api";
import { AuthShell, safeNextPath } from "@/components/AuthShell";
import { Alert } from "@/components/ui/States";
import { PasswordField } from "@/components/ui/PasswordField";

// Public demo-account hint. Off unless the build sets
// NEXT_PUBLIC_SHOW_DEMO_LOGIN=true (e.g. for an exhibition build where the
// backend runs with SEED_DEMO_DATA=true). Never show admin credentials.
const SHOW_DEMO_LOGIN = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === "true";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(safeNextPath() ?? (user.role === "admin" ? "/admin" : "/dashboard"));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 422)) setError("Invalid email or password.");
      else if (err instanceof ApiError && err.status === 403) setError("This account has been disabled.");
      else setError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  const [next, setNext] = useState<string | null>(null);
  useEffect(() => setNext(safeNextPath()), []);
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <AuthShell eyebrow="Welcome back" title="Log in">
      <form onSubmit={onSubmit} className="space-y-5" aria-describedby={error ? "login-error" : undefined}>
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
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            required
          />
        </div>
        <PasswordField
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          invalid={Boolean(error)}
          describedBy={error ? "login-error" : undefined}
        />
        {error && (
          <div id="login-error">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-brand-600">
        New to Smart Cosmetic AI?{" "}
        <Link href={registerHref} className="text-brand-900 underline underline-offset-4">
          Create an account
        </Link>
      </p>
      {SHOW_DEMO_LOGIN && (
        <p className="mt-10 border-t border-brand-200 pt-5 text-xs leading-relaxed text-brand-500">
          Demo customer with sample history: <code>demo@example.com</code> / <code>DemoCustomer123!</code>
        </p>
      )}
    </AuthShell>
  );
}
