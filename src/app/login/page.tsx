"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthShell, safeNextPath } from "@/components/AuthShell";

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
      if (err instanceof ApiError) setError("Invalid email or password.");
      else setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const [next, setNext] = useState<string | null>(null);
  useEffect(() => setNext(safeNextPath()), []);
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <AuthShell eyebrow="Welcome back" title="Log in">
      <form onSubmit={onSubmit} className="space-y-5">
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
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-brand-500">
        New to Smart Cosmetic AI?{" "}
        <Link href={registerHref} className="text-brand-900 underline underline-offset-4">
          Create an account
        </Link>
      </p>
      <p className="mt-10 border-t border-brand-200 pt-5 text-xs leading-relaxed text-brand-400">
        Demo customer with sample history: <code>demo@example.com</code> / <code>DemoCustomer123!</code>
      </p>
    </AuthShell>
  );
}
