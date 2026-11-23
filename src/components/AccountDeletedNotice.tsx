"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/States";

/** Shown on the home page after the account page redirects here with ?account=deleted. */
export function AccountDeletedNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(new URLSearchParams(window.location.search).get("account") === "deleted");
  }, []);
  if (!show) return null;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <Alert tone="success" title="Your account has been deleted">
        Your personal details have been removed and you have been signed out.
      </Alert>
    </div>
  );
}
