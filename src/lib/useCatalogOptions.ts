"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "./api";
import { CatalogOptions, catalogApi } from "./catalog";

/** Controlled vocabularies from GET /api/v1/catalog/options (never hard-coded here). */
export function useCatalogOptions() {
  const [options, setOptions] = useState<CatalogOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    catalogApi
      .options()
      .then((o) => !cancelled && setOptions(o))
      .catch((err) => !cancelled && setError(errorMessage(err, "We couldn’t load the product options.")));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { options, error, reload };
}
