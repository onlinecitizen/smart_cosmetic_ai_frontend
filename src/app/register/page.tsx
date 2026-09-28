"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthShell, safeNextPath } from "@/components/AuthShell";

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
      if (err instanceof ApiError) setError(typeof err.detail === "string" ? err.detail : "Please check your details.");
      else setError("Something went wrong. Please try again.");
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
          <input id="name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <p className="mt-1.5 text-xs text-brand-400">Your first name appears on your bottle.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="mt-1.5 text-xs text-brand-400">At least 8 characters.</p>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-brand-500">
        Already have an account?{" "}
        <Link href={loginHref} className="text-brand-900 underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
