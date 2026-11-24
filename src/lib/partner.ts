/**
 * Partner portal API (backend docs/partner.md, app/routers/partner.py).
 * Every shop-scoped call goes to /api/v1/partner/shops/{shopId}/...; the backend
 * checks shop ownership on each request, whatever this client does.
 */
import { api } from "./api";
import type { AdminCategory, AdminImage, AttributeSpecs, IdentityFields, Readiness } from "./adminCatalog";
import type { ImageApi } from "@/components/admin/catalogue/ImageGallery";
import { makeIntakeApi } from "./intake";

export interface Membership {
  retailer_id: string;
  name: string;
  city: string | null;
  role: string;
  status: "active" | "suspended" | string;
  suspended_reason: string | null;
}

export interface Application {
  id: string;
  shop_name: string;
  city: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decision_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface PartnerMe {
  shops: Membership[];
  applications: Application[];
}

export interface PartnerListing {
  id: string;
  sku: string;
  price_amount: number | null;
  currency: string | null;
  availability: string;
  stock_quantity: number | null;
  status: string;
  price_confirmed_at: string | null;
  stock_confirmed_at: string | null;
  updated_at: string;
  identity_id?: string | null;
  name?: string;
  identity_status?: string | null;
}

export interface Feedback {
  action: "return" | "reject";
  reason: string | null;
  at: string;
  by: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  brand: string | null;
  variant: string | null;
  size_label: string | null;
  category_code: string;
  status: string;
  owned: boolean;
  editable: boolean;
  updated_at: string;
  images: number;
  blockers: number;
  feedback: Feedback | null;
  listing: PartnerListing | null;
  pending_changes: number;
}

export interface ChangeRequest {
  id: string;
  identity_id: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decision_reason: string | null;
  decided_at: string | null;
  decided_by?: string | null;
  created_at: string;
}

export interface HistoryEntry {
  id: string;
  entity_type: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
  actor: string;
}

export interface ProductDetail extends Omit<ProductSummary, "images"> {
  description: string | null;
  ingredients_inci: string | null;
  usage_instructions: string | null;
  warnings: string | null;
  skin_types: string[] | null;
  concerns: string[] | null;
  attributes: Record<string, unknown> | null;
  gtin: string | null;
  manufacturer_code: string | null;
  category_path: string[];
  images: AdminImage[];
  readiness: Readiness;
  history: HistoryEntry[];
  change_requests: ChangeRequest[];
}

export interface ShopSummary {
  shop: { id: string; name: string; city: string | null; is_active: boolean };
  role: string;
  products_by_status: Record<string, number>;
  pending_change_requests: number;
  listings: number;
}

export interface ActivityEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  actor: string;
  extra: Record<string, unknown>;
  created_at: string;
}

export const partnerApi = {
  me: () => api.get<PartnerMe>("/api/v1/partner/me"),
  apply: (body: { shop_name: string; city?: string | null; message?: string | null }) =>
    api.post<{ id: string; status: string }>("/api/v1/partner/applications", body),
};

const enc = encodeURIComponent;

/** Everything one shop's partner can do, scoped to that shop. */
export function makeShopApi(shopId: string) {
  const base = `/api/v1/partner/shops/${enc(shopId)}`;
  const images: ImageApi = {
    uploadImage: (identityId, form) => api.postForm(`${base}/products/${enc(identityId)}/images/upload`, form),
    replaceImage: (imageId, form) => api.postForm(`${base}/images/${enc(imageId)}/replace`, form),
    updateImage: (imageId, body) => api.patch(`${base}/images/${enc(imageId)}`, body),
    reorderImages: (identityId, imageIds) => api.put(`${base}/products/${enc(identityId)}/images/order`, { image_ids: imageIds }),
    deleteImage: (imageId) => api.del(`${base}/images/${enc(imageId)}`),
  };
  return {
    base,
    images,
    intake: makeIntakeApi(`${base}/intake`),
    summary: () => api.get<ShopSummary>(base),
    formOptions: () => api.get<{ categories: AdminCategory[]; specs: AttributeSpecs }>(`${base}/form-options`),
    products: () => api.get<ProductSummary[]>(`${base}/products`),
    product: (id: string) => api.get<ProductDetail>(`${base}/products/${enc(id)}`),
    create: (body: Partial<IdentityFields> & Record<string, unknown>) => api.post<ProductDetail>(`${base}/products`, body),
    update: (id: string, body: Record<string, unknown>) => api.patch<ProductDetail>(`${base}/products/${enc(id)}`, body),
    submit: (id: string) => api.post<ProductDetail>(`${base}/products/${enc(id)}/submit`),
    requestChange: (id: string, changes: Record<string, unknown>, reason: string) =>
      api.post<ChangeRequest>(`${base}/products/${enc(id)}/changes`, { changes, reason }),
    listings: () => api.get<PartnerListing[]>(`${base}/listings`),
    offerEndpoint: (listingId: string) => `${base}/listings/${enc(listingId)}/offer`,
    activity: () => api.get<ActivityEntry[]>(`${base}/activity`),
  };
}

export type ShopApi = ReturnType<typeof makeShopApi>;

export const PRODUCT_STATUS_GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: "returned", label: "Returned or rejected — needs your correction", statuses: ["DRAFT_RETURNED", "REJECTED"] },
  { key: "draft", label: "Drafts", statuses: ["DRAFT"] },
  { key: "pending", label: "Waiting for approval", statuses: ["PENDING_REVIEW"] },
  { key: "published", label: "Approved and published", statuses: ["PUBLISHED"] },
  { key: "archived", label: "Archived", statuses: ["ARCHIVED"] },
];

/** Which group a product belongs to: a draft with review feedback counts as "returned". */
export function productGroup(p: Pick<ProductSummary, "status" | "feedback">): string {
  if (p.status === "REJECTED" || (p.status === "DRAFT" && p.feedback)) return "returned";
  return PRODUCT_STATUS_GROUPS.find((g) => g.statuses.includes(p.status))?.key ?? "draft";
}

const ACTIVITY_LABEL: Record<string, string> = {
  partner_product_created: "Product created",
  partner_listing_added: "Shop listing added to an existing product",
  catalog_identity_updated: "Product details changed",
  catalog_identity_submitted: "Submitted for approval",
  catalog_identity_published: "Approved and published",
  catalog_identity_returned: "Returned for correction",
  catalog_identity_rejected: "Rejected",
  catalog_identity_archived: "Archived",
  catalog_listing_updated: "Price or stock changed",
  catalog_listing_confirmed: "Price and stock confirmed unchanged",
  catalog_product_created: "Shop listing created",
  catalog_product_published: "Shop listing published",
  catalog_image_uploaded: "Photo uploaded",
  catalog_image_replaced: "Photo replaced",
  catalog_image_removed: "Photo removed",
  catalog_fact_added: "Source recorded",
  partner_change_requested: "Change proposed",
  partner_change_approved: "Change approved",
  partner_change_rejected: "Change rejected",
  intake_batch_created: "Import started",
  intake_file_uploaded: "Document uploaded",
  intake_file_processed: "Document processed",
  intake_file_failed: "Document processing failed",
  intake_candidate_submitted: "Imported draft submitted",
  partner_access_suspended: "Shop access suspended",
  partner_access_reactivated: "Shop access restored",
};

export function activityLabel(action: string): string {
  return ACTIVITY_LABEL[action] ?? action.replace(/_/g, " ");
}
