"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (adminOnly && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, loading, adminOnly, router, pathname]);

  if (loading || !user || (adminOnly && user.role !== "admin")) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border border-brand-200 border-t-gold-500" aria-label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}
