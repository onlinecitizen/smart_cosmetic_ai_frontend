/**
 * Partner catalogue API (backend docs/catalog.md §2.3). Types mirror
 * backend app/catalog/schemas.py. A null attribute means "not provided" -
 * never "safe" or "suitable".
 */
import { api } from "./api";

export interface Option {
  code: string;
  label: string;
}

export interface CategoryNode extends Option {
  attribute_group: string;
  children?: CategoryNode[];
}

export interface CatalogOptions {
  categories: Option[];
  /** Top-level groups (Skincare, Fragrance, ...) and their subcategories. Absent on old responses. */
  category_tree?: CategoryNode[];
  skin_types: Option[];
  concerns: Option[];
  avoid_groups: (Option & { terms: string[] })[];
  availability: Option[];
}

export interface CatalogRetailer {
  id: string;
  name: string;
  city: string | null;
  is_test_fixture: boolean;
  /** True when the retailer has a WhatsApp number configured. The number itself is never sent here. */
  whatsapp_available: boolean;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string;
  description: string | null;
  size_label: string | null;
  price_amount: number | null;
  currency: string | null;
  availability: "in_stock" | "out_of_stock" | "unknown" | string;
  ingredients_inci: string | null;
  skin_types: string[] | null;
  concerns: string[] | null;
  is_test_fixture: boolean;
  reviewed_at: string | null;
  retailer: CatalogRetailer;
  /** Displayable photos, main photo first (catalogue foundation; may be absent on old responses). */
  images?: { id: string; url: string | null; alt_text: string | null; is_primary: boolean; licence_note?: string | null }[];
  usage_instructions?: string | null;
  warnings?: string | null;
}

export interface AdminCatalogProduct extends CatalogProduct {
  retailer_id: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminRetailer extends CatalogRetailer {
  whatsapp_number: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductList {
  items: CatalogProduct[];
  total: number;
}

export type SkinTypeAnswer = "dry" | "oily" | "combination" | "normal" | "not_sure";

export interface RecommendationRequest {
  skin_type: SkinTypeAnswer;
  concerns: string[];
  avoid_groups: string[];
  avoid_ingredients: string[];
  category: string | null;
}

export interface RecommendationResult {
  method: string;
  evaluated_count: number;
  recommended: {
    product: CatalogProduct;
    score: number;
    matched_concerns: string[];
    reasons: string[];
    cautions: string[];
  }[];
  excluded: {
    product: { id: string; name: string; brand: string | null; retailer_name: string; is_test_fixture: boolean };
    reasons: string[];
  }[];
  not_matched_count: number;
  limitations: string[];
}

/** Sort orders the backend supports (app/catalog/schemas.py ProductSort). */
export type ProductSort = "name" | "price_asc" | "price_desc" | "recent";

export const SORT_LABEL: Record<ProductSort, string> = {
  name: "Name (A–Z)",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  recent: "Newest",
};

export const catalogApi = {
  options: () => api.get<CatalogOptions>("/api/v1/catalog/options"),
  list: (params: {
    category?: string;
    q?: string;
    availability?: string;
    sort?: ProductSort;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.q) qs.set("q", params.q);
    if (params.availability) qs.set("availability", params.availability);
    if (params.sort && params.sort !== "name") qs.set("sort", params.sort);
    qs.set("limit", String(params.limit ?? 24));
    qs.set("offset", String(params.offset ?? 0));
    return api.get<ProductList>(`/api/v1/catalog/products?${qs.toString()}`);
  },
  get: (id: string) => api.get<CatalogProduct>(`/api/v1/catalog/products/${encodeURIComponent(id)}`),
  recommend: (body: RecommendationRequest) =>
    api.post<RecommendationResult>("/api/v1/catalog/recommendations", body),
};

/** code -> label lookup for an option list, falling back to a readable code. */
export function labeller(options: Option[] | undefined): (code: string) => string {
  const map = new Map((options ?? []).map((o) => [o.code, o.label]));
  return (code) => map.get(code) ?? code.replace(/_/g, " ");
}

export const AVAILABILITY_LABEL: Record<string, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  unknown: "Availability not confirmed",
};

/** Parses a comma/newline separated list typed by the customer. */
export function parseAvoidList(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/\s+/g, " ").toLowerCase())
    .filter((t) => t.length > 0 && !seen.has(t) && (seen.add(t), true));
}

/** Client-side mirror of the backend rule: each term 3-60 chars, at most 10. */
export function avoidListError(terms: string[]): string | null {
  if (terms.length > 10) return "List at most 10 ingredients.";
  const bad = terms.find((t) => t.length < 3 || t.length > 60);
  return bad ? `“${bad}” must be between 3 and 60 characters.` : null;
}

/**
 * Category code -> its top-level group (e.g. "perfume" -> Fragrance). Groups
 * map to themselves. Unknown codes return null.
 */
export function groupOf(tree: CategoryNode[] | undefined, code: string): CategoryNode | null {
  for (const group of tree ?? []) {
    if (group.code === code || group.children?.some((c) => c.code === code)) return group;
  }
  return null;
}
