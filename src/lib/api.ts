"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// CSRF token held in memory only (never localStorage). Set from the
// login/register/me responses; needed because a cross-site frontend cannot
// read the backend's CSRF cookie via document.cookie.
let csrfTokenInMemory: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfTokenInMemory = token;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; isForm?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, isForm = false } = options;

  const headers: Record<string, string> = {};
  if (!isForm && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (method !== "GET") {
    const csrf = csrfTokenInMemory || readCookie("cosmetic_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const detail = typeof data === "object" && data !== null && "detail" in data ? (data as { detail: unknown }).detail : data;
    throw new ApiError(res.status, detail);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form, isForm: true }),
};

// ---------- Types ----------
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "customer" | "admin";
  created_at: string;
  csrf_token?: string;
}

export interface DiagnosticSession {
  id: string;
  status: string;
  created_at: string;
}

export interface DiagnosticResult {
  id: string;
  provider: string;
  model_version: string;
  hydration: number;
  redness: number;
  pore_density: number;
  barrier_index: number;
  confidence: number;
  image_quality: { ok: boolean; reasons: string[]; brightness: number; sharpness: number };
  created_at: string;
}

export interface ClimateSnapshot {
  id: string;
  provider: string;
  region: string;
  temperature_c: number;
  humidity: number;
  uv_index: number | null;
  created_at: string;
}

export interface FormulaIngredientLine {
  ingredient_id: string;
  volume_ml: number;
  percentage: number;
  max_allowed_percentage: number;
}

export interface Formula {
  id: string;
  formula_code: string;
  base_emulsion_ml: number;
  formula_version: number;
  status: "GENERATED" | "VALIDATED" | "INVALID";
  rules_used: { rule_code: string; ingredient_code: string }[];
  diagnostic_model_version: string;
  validation_errors: string[];
  created_at: string;
  items: FormulaIngredientLine[];
}

export interface Order {
  id: string;
  order_code: string;
  formula_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  max_concentration_percent: number;
  unit: string;
  is_development_placeholder: boolean;
  version: number;
}

export interface FormulationRule {
  id: string;
  code: string;
  ingredient_id: string;
  condition_metric: string;
  condition_operator: string;
  condition_threshold: number;
  recommended_volume_ml: number;
  max_volume_ml: number;
  reason: string;
  status: string;
  version: number;
  approved_by: string | null;
  approved_at: string | null;
}
