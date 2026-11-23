/**
 * Admin catalogue API (backend docs/catalog.md §8, app/routers/admin_catalog.py).
 * Types mirror backend app/catalog/schemas.py. Authorisation is enforced by the
 * backend on every call; this client only decides what to show.
 */
import { api, ApiError, errorMessage } from "./api";
import type { AdminCatalogProduct, AdminRetailer } from "./catalog";

export type CatalogStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED";

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Waiting for review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

export const STATUS_TONE: Record<string, "neutral" | "progress" | "done" | "stopped"> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "progress",
  PUBLISHED: "done",
  REJECTED: "stopped",
  ARCHIVED: "stopped",
};

export interface ReadinessIssue {
  code: string;
  field: string | null;
  message: string;
}

export interface Readiness {
  can_publish: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
}

export interface AdminImage {
  id: string;
  identity_id: string;
  url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
  width: number | null;
  height: number | null;
  source_type: string;
  storage_backend: string;
  storage_key: string | null;
  content_type: string | null;
  byte_size: number | null;
  sha256: string | null;
  source_reference: string | null;
  licence_note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Fact {
  id: string;
  identity_id: string;
  field: string;
  value: unknown;
  source_type: string;
  source_reference: string | null;
  verification_state: "unverified" | "verified" | "rejected" | string;
  note: string | null;
  created_by: string | null;
  verified_by: string | null;
  verified_by_email: string | null;
  verified_at: string | null;
  created_at: string;
}

/** Product-level facts. Shop price and stock live on listings, never here. */
export interface IdentityFields {
  name: string;
  brand: string | null;
  variant: string | null;
  size_label: string | null;
  category: string;
  description: string | null;
  ingredients_inci: string | null;
  usage_instructions: string | null;
  warnings: string | null;
  skin_types: string[] | null;
  concerns: string[] | null;
  attributes: Record<string, unknown> | null;
  gtin: string | null;
  manufacturer_code: string | null;
}

export interface AdminIdentity extends Omit<IdentityFields, "category"> {
  id: string;
  category_code: string;
  category_path: string[];
  normalized_key: string;
  status: CatalogStatus | string;
  is_test_fixture: boolean;
  created_by: string | null;
  created_by_email: string | null;
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  listing_ids: string[];
  images: AdminImage[];
  facts: Fact[];
  readiness: Readiness | null;
}

export interface AdminListing extends AdminCatalogProduct {
  identity_id: string | null;
  stock_quantity: number | null;
  price_confirmed_at: string | null;
  stock_confirmed_at: string | null;
  identity_status: string | null;
}

export interface ReviewEvent {
  id: string;
  entity_type: "identity" | "listing" | "fact" | string;
  entity_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  note: string | null;
  created_at: string;
}

export interface AdminCategory {
  code: string;
  label: string;
  parent_code: string | null;
  attribute_group: string;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

export interface AttributeSpec {
  kind: "text" | "int" | "bool" | "choice" | "choices" | "texts";
  choices: string[];
  min: number | null;
  max: number | null;
}
export type AttributeSpecs = Record<string, Record<string, AttributeSpec>>;

export interface Overview {
  identities_by_status: Record<string, number>;
  listings_by_status: Record<string, number>;
  publicly_visible_listings: number;
  review_queue: number;
  unverified_facts: number;
  products_without_images: number;
  listings_price_unconfirmed: number;
  order_requests_by_status: Record<string, number>;
  image_uploads_enabled: boolean;
}

export interface Duplicate {
  identity_id: string;
  name: string;
  brand: string | null;
  variant: string | null;
  size_label: string | null;
  status: string;
  reason: string;
  score: number;
}

export const IMAGE_SOURCES: { code: string; label: string }[] = [
  { code: "shop_supplied", label: "Supplied by the shop" },
  { code: "brand_supplied", label: "Supplied by the brand" },
  { code: "own_photo", label: "Our own photo" },
  { code: "other", label: "Other (explain in the reference)" },
];

export const FACT_SOURCES: { code: string; label: string }[] = [
  { code: "label_photo", label: "Photo of the label" },
  { code: "brand_website", label: "Brand website" },
  { code: "brand_document", label: "Brand document" },
  { code: "shop_supplied", label: "Shop supplied" },
  { code: "manual_check", label: "Checked by hand" },
];

/** Product fields shown on the review screen, with readable names. */
export const FIELD_LABEL: Record<string, string> = {
  name: "Name",
  brand: "Brand",
  variant: "Variant (shade, scent, edition)",
  size_label: "Pack size",
  category: "Category",
  description: "Description",
  ingredients_inci: "Ingredient list (INCI)",
  usage_instructions: "How to use",
  warnings: "Warnings and precautions",
  skin_types: "Skin types",
  concerns: "Concerns",
  attributes: "Attributes",
  gtin: "Barcode (GTIN)",
  manufacturer_code: "Manufacturer code",
  claim: "Claim",
  images: "Photos",
  listings: "Shop listings",
  facts: "Sources",
};

const BASE = "/api/v1/admin/catalog";
const enc = encodeURIComponent;

export const adminCatalogApi = {
  overview: () => api.get<Overview>(`${BASE}/overview`),
  identities: (params: { q?: string; status?: string; category?: string } = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return api.get<AdminIdentity[]>(`${BASE}/identities${s ? `?${s}` : ""}`);
  },
  identity: (id: string) => api.get<AdminIdentity>(`${BASE}/identities/${enc(id)}`),
  createIdentity: (body: IdentityFields & { allow_similar?: boolean }) =>
    api.post<AdminIdentity>(`${BASE}/identities`, body),
  updateIdentity: (id: string, body: Partial<IdentityFields> & { expected_updated_at?: string }) =>
    api.patch<AdminIdentity>(`${BASE}/identities/${enc(id)}`, body),
  transition: (id: string, action: "submit" | "publish" | "reject" | "return" | "archive" | "restore", text?: string) => {
    const needsReason = action === "reject" || action === "return";
    const body = needsReason ? { reason: text ?? "" } : text ? { note: text } : undefined;
    return api.post<AdminIdentity>(`${BASE}/identities/${enc(id)}/${action}`, body);
  },
  history: (id: string) => api.get<ReviewEvent[]>(`${BASE}/identities/${enc(id)}/history`),
  listings: (id: string) => api.get<AdminListing[]>(`${BASE}/identities/${enc(id)}/listings`),
  duplicates: (body: { name: string; brand?: string | null; variant?: string | null; size_label?: string | null; gtin?: string | null; manufacturer_code?: string | null; exclude_id?: string }) =>
    api.post<Duplicate[]>(`${BASE}/identities/duplicates`, body),

  createListing: (body: Record<string, unknown>) => api.post<AdminListing>(`${BASE}/products`, body),
  updateOffer: (id: string, body: Record<string, unknown>) =>
    api.patch<AdminListing>(`${BASE}/products/${enc(id)}/listing`, body),
  listingAction: (id: string, action: "publish" | "archive" | "restore") =>
    api.post<AdminListing>(`${BASE}/products/${enc(id)}/${action}`),
  listingReadiness: (id: string) => api.get<Readiness>(`${BASE}/products/${enc(id)}/readiness`),
  retailers: () => api.get<AdminRetailer[]>(`${BASE}/retailers`),

  uploadImage: (identityId: string, form: FormData) =>
    api.postForm<AdminImage>(`${BASE}/identities/${enc(identityId)}/images/upload`, form),
  replaceImage: (imageId: string, form: FormData) =>
    api.postForm<AdminImage>(`${BASE}/images/${enc(imageId)}/replace`, form),
  updateImage: (imageId: string, body: { alt_text?: string | null; licence_note?: string | null; is_primary?: true }) =>
    api.patch<AdminImage>(`${BASE}/images/${enc(imageId)}`, body),
  reorderImages: (identityId: string, imageIds: string[]) =>
    api.put<AdminImage[]>(`${BASE}/identities/${enc(identityId)}/images/order`, { image_ids: imageIds }),
  deleteImage: (imageId: string) => api.del(`${BASE}/images/${enc(imageId)}`),

  addFact: (identityId: string, body: { field: string; value: unknown; source_type: string; source_reference?: string | null; note?: string | null }) =>
    api.post<Fact>(`${BASE}/identities/${enc(identityId)}/facts`, body),
  verifyFact: (factId: string, note?: string) =>
    api.post<Fact>(`${BASE}/facts/${enc(factId)}/verify`, note ? { note } : undefined),
  rejectFact: (factId: string, reason: string) => api.post<Fact>(`${BASE}/facts/${enc(factId)}/reject`, { reason }),

  categories: () => api.get<AdminCategory[]>(`${BASE}/categories`),
  createCategory: (body: { code: string; label: string; parent_code?: string | null; attribute_group?: string | null }) =>
    api.post<AdminCategory>(`${BASE}/categories`, body),
  updateCategory: (code: string, body: { label?: string; sort_order?: number; is_active?: boolean }) =>
    api.patch<AdminCategory>(`${BASE}/categories/${enc(code)}`, body),
  attributeSpecs: () => api.get<AttributeSpecs>(`${BASE}/attribute-specs`),
};

// ---------------------------------------------------------------- helpers

/**
 * A sentence for an admin action that failed. Unlike the customer-facing
 * `errorMessage`, this shows the server's explanation for refusals (409/413/
 * 415/422/503), because the admin needs to know exactly what to fix.
 */
export function adminError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && [409, 413, 415, 422, 503].includes(err.status)) {
    const d = err.detail;
    if (typeof d === "string" && d.trim()) return d;
    if (d && typeof d === "object" && !Array.isArray(d) && typeof (d as { message?: unknown }).message === "string")
      return (d as { message: string }).message;
    if (Array.isArray(d)) {
      const parts = d
        .map((e) => {
          if (!e || typeof e !== "object") return null;
          const loc = Array.isArray((e as { loc?: unknown }).loc) ? (e as { loc: unknown[] }).loc : [];
          const field = loc.filter((x) => x !== "body").join(".");
          const msg = String((e as { msg?: unknown }).msg ?? "").replace(/^Value error, /, "");
          return field ? `${FIELD_LABEL[field] ?? field}: ${msg}` : msg;
        })
        .filter(Boolean);
      if (parts.length) return parts.join(" ");
    }
  }
  return errorMessage(err, fallback);
}

/** True when the failure was the server's stale-edit protection. */
export function isStale(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 409 &&
    typeof err.detail === "object" &&
    err.detail !== null &&
    (err.detail as { code?: unknown }).code === "stale"
  );
}

/** Duplicates attached to a 409 from product creation, if any. */
export function duplicatesFrom(err: unknown): Duplicate[] {
  if (err instanceof ApiError && err.status === 409 && err.detail && typeof err.detail === "object") {
    const list = (err.detail as { duplicates?: unknown }).duplicates;
    if (Array.isArray(list)) return list as Duplicate[];
  }
  return [];
}

export function identityToFields(i: AdminIdentity): IdentityFields {
  return {
    name: i.name,
    brand: i.brand,
    variant: i.variant,
    size_label: i.size_label,
    category: i.category_code,
    description: i.description,
    ingredients_inci: i.ingredients_inci,
    usage_instructions: i.usage_instructions,
    warnings: i.warnings,
    skin_types: i.skin_types,
    concerns: i.concerns,
    attributes: i.attributes,
    gtin: i.gtin,
    manufacturer_code: i.manufacturer_code,
  };
}

export const EMPTY_FIELDS: IdentityFields = {
  name: "",
  brand: null,
  variant: null,
  size_label: null,
  category: "",
  description: null,
  ingredients_inci: null,
  usage_instructions: null,
  warnings: null,
  skin_types: null,
  concerns: null,
  attributes: null,
  gtin: null,
  manufacturer_code: null,
};

function norm(v: unknown): unknown {
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (Array.isArray(v)) return v.length ? v : null;
  if (v && typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== null && x !== undefined && x !== "");
    return entries.length ? Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) : null;
  }
  return v ?? null;
}

/** Only the fields the editor actually changed, normalised the way the server stores them. */
export function changedFields(original: IdentityFields, draft: IdentityFields): Partial<IdentityFields> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(draft) as (keyof IdentityFields)[]) {
    const a = norm(original[key]);
    const b = norm(draft[key]);
    if (JSON.stringify(a) !== JSON.stringify(b)) out[key] = b;
  }
  return out as Partial<IdentityFields>;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Quick checks before uploading. The server repeats them on the actual bytes. */
export function imageFileError(file: { type: string; size: number; name: string }): string | null {
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_IMAGE_BYTES) return "The photo is larger than 5 MB. Export a smaller version.";
  if (file.type && !IMAGE_TYPES.includes(file.type)) return "Only JPEG, PNG or WebP photos can be uploaded.";
  return null;
}

/** Move one item of a list (gallery ordering). Out-of-range moves return the list unchanged. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Comma/newline separated text -> unique trimmed entries. */
export function splitList(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter((t) => t && !seen.has(t) && (seen.add(t), true));
}

export function formatBytes(n: number | null): string {
  if (n == null) return "size unknown";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const ACTION_LABEL: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  submit: "Submitted for review",
  publish: "Published",
  reject: "Rejected",
  return: "Returned for correction",
  archive: "Archived",
  restore: "Restored",
  returned_to_draft: "Returned to draft after an edit",
  verify: "Source verified",
};

export function describeEvent(e: ReviewEvent): string {
  const what = e.entity_type === "listing" ? "Shop listing" : e.entity_type === "fact" ? "Source" : "Product";
  const action = e.entity_type === "fact" && e.action === "reject" ? "Source rejected" : ACTION_LABEL[e.action] ?? e.action;
  const move =
    e.from_status && e.to_status && e.from_status !== e.to_status
      ? ` (${STATUS_LABEL[e.from_status] ?? e.from_status} → ${STATUS_LABEL[e.to_status] ?? e.to_status})`
      : "";
  return `${what}: ${action}${move}`;
}

/** Lower-case code from a label: "Face oil" -> "face_oil". The admin can edit it before saving. */
export function suggestCode(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "c_$1")
    .slice(0, 32);
}
