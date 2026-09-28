"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-brand-100 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-brand-700 text-lg">
          🌿 Smart Cosmetic AI
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {!loading && user && (
            <>
              <Link href="/dashboard" className="hover:text-brand-600">
                Dashboard
              </Link>
              <Link href="/analyze" className="hover:text-brand-600">
                New Diagnostic
              </Link>
              <Link href="/orders" className="hover:text-brand-600">
                Orders
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="hover:text-brand-600">
                  Admin
                </Link>
              )}
              <span className="text-brand-400">|</span>
              <span className="text-brand-500">{user.full_name}</span>
              <button
                className="btn-secondary !px-3 !py-1"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="hover:text-brand-600">
                Log in
              </Link>
              <Link href="/register" className="btn-primary !px-3 !py-1">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
