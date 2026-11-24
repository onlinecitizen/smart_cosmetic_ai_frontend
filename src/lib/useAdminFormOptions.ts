"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormOptions } from "@/components/admin/catalogue/IdentityForm";
import { adminCatalogApi, adminError } from "./adminCatalog";
import { catalogApi } from "./catalog";

/** Categories (including retired), attribute specs and vocabularies for the product form. */
export function useAdminFormOptions(
  loader: () => Promise<{ categories: FormOptions["categories"]; specs: FormOptions["specs"] }> = async () => {
    const [categories, specs] = await Promise.all([adminCatalogApi.categories(), adminCatalogApi.attributeSpecs()]);
    return { categories, specs };
  }
) {
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([loader(), catalogApi.options()])
      .then(([{ categories, specs }, opts]) => {
        if (!cancelled) setOptions({ categories, specs, skinTypes: opts.skin_types, concerns: opts.concerns });
      })
      .catch((err) => !cancelled && setError(adminError(err, "Could not load the product options.")));
    return () => {
      cancelled = true;
    };
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return { options, error, reload };
}
