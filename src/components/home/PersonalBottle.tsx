"use client";

import { useEffect, useState } from "react";
import { Bottle } from "@/components/Bottle";
import { api, Formula } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { firstName } from "@/lib/product";

/**
 * The bottle shown on public pages. When a signed-in customer has a
 * validated formula, it carries their real name and latest formula code;
 * otherwise it shows a neutral "your name here" label.
 */
export function PersonalBottle({ className = "", revealed }: { className?: string; revealed?: boolean }) {
  const { user } = useAuth();
  const [code, setCode] = useState<string | undefined>();

  useEffect(() => {
    if (!user) {
      setCode(undefined);
      return;
    }
    api
      .get<Formula[]>("/api/v1/formulas")
      .then((formulas) => setCode(formulas.find((f) => f.status === "VALIDATED")?.formula_code))
      .catch(() => setCode(undefined));
  }, [user]);

  return (
    <Bottle name={user ? firstName(user.full_name) : "Your name"} code={code} revealed={revealed} className={className} />
  );
}
