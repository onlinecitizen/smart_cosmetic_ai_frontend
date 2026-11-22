"use client";

import { useCallback, useEffect, useState } from "react";
import { api, Product } from "./api";
import { PRODUCT_CODE } from "./product";

/** Server-side product + price (public endpoint, no sign-in needed). */
export function useProduct(code: string = PRODUCT_CODE): {
  product: Product | null;
  failed: boolean;
  reload: () => void;
} {
  const [product, setProduct] = useState<Product | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Product>(`/api/v1/products/${code}`)
      .then((p) => !cancelled && setProduct(p))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  return { product, failed, reload };
}
