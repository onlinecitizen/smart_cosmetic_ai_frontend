/**
 * Product intake API (backend docs/intake.md, app/routers/admin_intake.py).
 * Admin only; the backend enforces it on every call.
 */
import { api } from "./api";

export type FileRole = "catalogue" | "price_list" | "photo";

export const ROLE_LABEL: Record<FileRole, string> = {
  catalogue: "Product catalogue / product sheet",
  price_list: "Price list (prices and stock only)",
  photo: "Packaging photo",
};

export interface Capabilities {
  storage_configured: boolean;
  ocr_available: boolean;
  ai_enabled: boolean;
  ai_provider: string;
  antivirus: string;
  max_file_mb: number;
  max_pdf_pages: number;
  max_files_per_batch: number;
  job_timeout_seconds: number;
}

export interface IntakeFile {
  id: string;
  role: FileRole;
  kind: "pdf" | "image" | "csv" | "xlsx";
  original_filename: string;
  byte_size: number;
  page_count: number | null;
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  attempts: number;
  max_attempts: number;
  error: string | null;
  warnings: string[];
  scan_result: Record<string, string>;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  pages_read: number;
  pages_unreadable: number;
  pages_ocr: number;
  records: number;
}

export interface Batch {
  id: string;
  name: string;
  retailer: { id: string; name: string } | null;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | "SUBMITTED";
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
  assembled_at: string | null;
  candidate_counts: Record<string, number>;
  file_count: number;
  failed_files: number;
  files?: IntakeFile[];
  unmatched_price_rows?: { file: string | null; page: number | null; row: number | null; values: Record<string, unknown>; snippet: string | null }[];
}

export interface Evidence {
  file_id: string | null;
  filename: string | null;
  page: number | null;
  row: number | null;
  snippet: string;
  method: string;
  extraction_confidence: number;
  ocr_confidence: number | null;
  value: unknown;
  invalid: string | null;
}

export interface FieldEntry {
  value: unknown;
  status: "found" | "conflict" | "invalid" | "missing" | "edited";
  evidence: Evidence[];
  alternatives?: unknown[];
  edited?: boolean;
  edited_by?: string;
}

export interface Issue {
  code: string;
  field: string | null;
  message: string;
  severity: "blocker" | "warning";
}

export interface Candidate {
  id: string;
  batch_id: string;
  status: "NEEDS_REVIEW" | "CONFIRMED" | "REJECTED" | "SUBMITTED";
  fields: Record<string, FieldEntry>;
  issues: Issue[];
  duplicates: { identity_id: string; name: string; brand: string | null; size_label: string | null; status: string; reason: string }[];
  category_code: string | null;
  attach_to_identity_id: string | null;
  allow_similar: boolean;
  image_ids: string[];
  suggested_image_ids: string[];
  identity_id: string | null;
  listing_id: string | null;
  submit_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntakeImage {
  id: string;
  file_id: string;
  filename: string | null;
  page_number: number | null;
  width: number;
  height: number;
  suggested_candidate_id: string | null;
  link_strength: "strong" | "medium" | null;
  link_evidence: string | null;
  url: string;
}

export interface PageText {
  page: number;
  method: string;
  status: "ok" | "empty" | "unreadable";
  ocr_confidence: number | null;
  note: string | null;
  text: string | null;
}

export interface SubmitResult {
  candidate_id: string;
  ok: boolean;
  identity_id?: string | null;
  listing_id?: string | null;
  error?: string;
  notes: string[];
}

const BASE = "/api/v1/admin/intake";
const enc = encodeURIComponent;

export const intakeApi = {
  capabilities: () => api.get<Capabilities>(`${BASE}/capabilities`),
  batches: () => api.get<Batch[]>(`${BASE}/batches`),
  createBatch: (body: { name: string; retailer_id: string | null }) => api.post<Batch>(`${BASE}/batches`, body),
  batch: (id: string) => api.get<Batch>(`${BASE}/batches/${enc(id)}`),
  deleteBatch: (id: string) => api.del(`${BASE}/batches/${enc(id)}`),
  upload: (batchId: string, file: File, role: FileRole) => {
    const form = new FormData();
    form.set("file", file);
    form.set("role", role);
    return api.postForm<IntakeFile>(`${BASE}/batches/${enc(batchId)}/files`, form);
  },
  retryFile: (id: string) => api.post<IntakeFile>(`${BASE}/files/${enc(id)}/retry`),
  pages: (fileId: string) => api.get<PageText[]>(`${BASE}/files/${enc(fileId)}/pages`),
  originalUrl: (fileId: string) => `${BASE}/files/${enc(fileId)}/original`,
  candidates: (batchId: string) => api.get<Candidate[]>(`${BASE}/batches/${enc(batchId)}/candidates`),
  images: (batchId: string) => api.get<IntakeImage[]>(`${BASE}/batches/${enc(batchId)}/images`),
  updateCandidate: (id: string, body: Record<string, unknown>) => api.patch<Candidate>(`${BASE}/candidates/${enc(id)}`, body),
  candidateAction: (id: string, action: "confirm" | "reject" | "reopen", reason?: string) =>
    api.post<Candidate>(`${BASE}/candidates/${enc(id)}/${action}`, action === "reject" && reason ? { reason } : undefined),
  submit: (batchId: string, candidateIds?: string[]) =>
    api.post<{ results: SubmitResult[]; batch: Batch }>(`${BASE}/batches/${enc(batchId)}/submit`, candidateIds ? { candidate_ids: candidateIds } : undefined),
};

// ---------------------------------------------------------------- helpers

/** Review order for extracted fields, with labels (mirrors backend app/intake/fields.py). */
export const INTAKE_FIELDS: { key: string; label: string; long?: boolean; listing?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "brand", label: "Brand" },
  { key: "variant", label: "Variant" },
  { key: "size_label", label: "Pack size" },
  { key: "category_hint", label: "Category (as written)" },
  { key: "gtin", label: "Barcode (GTIN)" },
  { key: "manufacturer_code", label: "Manufacturer code" },
  { key: "ingredients_inci", label: "Ingredient list (INCI)", long: true },
  { key: "usage_instructions", label: "How to use", long: true },
  { key: "warnings", label: "Warnings", long: true },
  { key: "description", label: "Description", long: true },
  { key: "sku", label: "Shop product code (SKU)", listing: true },
  { key: "price_amount", label: "Price (whole amount)", listing: true },
  { key: "currency", label: "Currency", listing: true },
  { key: "stock_quantity", label: "Units in stock", listing: true },
];

export const BATCH_STATUS_LABEL: Record<Batch["status"], string> = {
  UPLOADING: "Waiting for files",
  PROCESSING: "Processing",
  READY: "Ready for review",
  FAILED: "Processing failed",
  SUBMITTED: "Submitted for approval",
};

export const CANDIDATE_STATUS_LABEL: Record<Candidate["status"], string> = {
  NEEDS_REVIEW: "Needs review",
  CONFIRMED: "Ready to submit",
  REJECTED: "Rejected",
  SUBMITTED: "Submitted",
};

const METHOD_LABEL: Record<string, string> = {
  table: "table",
  sheet: "spreadsheet",
  label: "labelled text",
  pattern: "text pattern",
  ai: "AI assistant",
  manual: "typed in",
};

export function methodLabel(method: string): string {
  return METHOD_LABEL[method] ?? method;
}

/** "price-list.pdf, page 2, row 5". */
export function whereFound(e: Pick<Evidence, "filename" | "page" | "row">): string {
  return [e.filename ?? "uploaded file", e.page != null ? `page ${e.page}` : null, e.row != null ? `row ${e.row}` : null]
    .filter(Boolean)
    .join(", ");
}

export function showValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function isProcessing(batch: Pick<Batch, "status" | "files">): boolean {
  return batch.status === "PROCESSING" || (batch.files ?? []).some((f) => f.status === "QUEUED" || f.status === "PROCESSING");
}

export function issueCounts(issues: Issue[]): { blockers: number; warnings: number } {
  return {
    blockers: issues.filter((i) => i.severity === "blocker").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
  };
}

/** Only fields whose typed value differs from the stored one; "" clears a field. */
export function changedFieldValues(fields: Record<string, FieldEntry>, drafts: Record<string, string>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [key, typed] of Object.entries(drafts)) {
    const current = showValue(fields[key]?.value);
    if (typed.trim() !== current.trim()) out[key] = typed.trim() === "" ? null : typed.trim();
  }
  return out;
}

/** OCR reading confidence is about characters, never about truth. */
export function confidenceText(e: Pick<Evidence, "extraction_confidence" | "ocr_confidence">): string {
  const parts = [`extraction ${Math.round(e.extraction_confidence * 100)}%`];
  if (e.ocr_confidence != null) parts.push(`OCR reading ${Math.round(e.ocr_confidence * 100)}%`);
  return parts.join(" · ");
}
