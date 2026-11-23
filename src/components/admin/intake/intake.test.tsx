import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminCategory } from "@/lib/adminCatalog";
import {
  Candidate,
  changedFieldValues,
  confidenceText,
  IntakeImage,
  isProcessing,
  issueCounts,
  methodLabel,
  whereFound,
} from "@/lib/intake";
import { CapabilityNotes } from "./CapabilityNotes";
import { CandidateReview } from "./CandidateReview";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

const ev = (over: Record<string, unknown> = {}) => ({
  file_id: "f1",
  filename: "catalogue.pdf",
  page: 2,
  row: null,
  snippet: "Price: TZS 18,000",
  method: "label",
  extraction_confidence: 0.85,
  ocr_confidence: null,
  value: 18000,
  invalid: null,
  ...over,
});

const CANDIDATE: Candidate = {
  id: "c1",
  batch_id: "b1",
  status: "NEEDS_REVIEW",
  fields: {
    name: { value: "Argan Hair Oil", status: "found", evidence: [ev({ snippet: "Product: Argan Hair Oil", value: "Argan Hair Oil" })] },
    brand: { value: "Scan Co", status: "found", evidence: [ev({ snippet: "Brand: Scan Co", value: "Scan Co", ocr_confidence: 0.81 })] },
    price_amount: {
      value: null,
      status: "conflict",
      alternatives: [18000, 21000],
      evidence: [ev(), ev({ filename: "prices.csv", page: null, row: 4, method: "sheet", value: 21000, snippet: "DC-1 | 21,000" })],
    },
  },
  issues: [
    { code: "conflict", field: "price_amount", message: "Price: different values found (18000 / 21000). Choose the correct one.", severity: "blocker" },
    { code: "ocr", field: "brand", message: "Brand was read by OCR (reading confidence 81%).", severity: "warning" },
  ],
  duplicates: [{ identity_id: "i9", name: "Argan Hair Oil", brand: "Scan Co", size_label: "100 ml", status: "PUBLISHED", reason: "same_attributes" }],
  category_code: "hair_oil",
  attach_to_identity_id: null,
  allow_similar: false,
  image_ids: [],
  suggested_image_ids: ["img1"],
  identity_id: null,
  listing_id: null,
  submit_error: null,
  created_at: "2026-11-23T10:00:00Z",
  updated_at: "2026-11-23T10:00:00Z",
};

const CATEGORIES: AdminCategory[] = [
  { code: "haircare", label: "Hair care", parent_code: null, attribute_group: "haircare", sort_order: 0, is_active: true, product_count: 0 },
  { code: "hair_oil", label: "Hair oil", parent_code: "haircare", attribute_group: "haircare", sort_order: 0, is_active: true, product_count: 0 },
];

const IMAGES: IntakeImage[] = [
  {
    id: "img1",
    file_id: "f2",
    filename: "photo.jpg",
    page_number: null,
    width: 400,
    height: 400,
    suggested_candidate_id: "c1",
    link_strength: "medium",
    link_evidence: "the brand and product name are visible in the photo (OCR)",
    url: "/api/v1/admin/intake/images/img1/file",
  },
];

describe("intake helpers", () => {
  it("describes where and how a value was found, keeping OCR separate", () => {
    expect(whereFound({ filename: "a.pdf", page: 3, row: null })).toBe("a.pdf, page 3");
    expect(whereFound({ filename: "s.xlsx", page: 1, row: 7 })).toBe("s.xlsx, page 1, row 7");
    expect(methodLabel("ai")).toBe("AI assistant");
    expect(confidenceText({ extraction_confidence: 0.85, ocr_confidence: 0.81 })).toBe("extraction 85% · OCR reading 81%");
    expect(confidenceText({ extraction_confidence: 0.95, ocr_confidence: null })).toBe("extraction 95%");
  });
  it("sends only changed field values and clears with empty text", () => {
    expect(changedFieldValues(CANDIDATE.fields, { name: "Argan Hair Oil ", brand: "", price_amount: "21000" })).toEqual({
      brand: null,
      price_amount: "21000",
    });
  });
  it("knows when a batch is still processing and counts issues", () => {
    expect(isProcessing({ status: "READY", files: [{ status: "QUEUED" } as never] })).toBe(true);
    expect(isProcessing({ status: "READY", files: [{ status: "DONE" } as never] })).toBe(false);
    expect(issueCounts(CANDIDATE.issues)).toEqual({ blockers: 1, warnings: 1 });
  });
  it("states plainly what the server can't do", () => {
    render(
      <CapabilityNotes
        caps={{ storage_configured: true, ocr_available: false, ai_enabled: false, ai_provider: "none", antivirus: "not configured", max_file_mb: 15, max_pdf_pages: 60, max_files_per_batch: 20, job_timeout_seconds: 180 }}
      />
    );
    expect(screen.getByText(/OCR is not installed/)).toBeInTheDocument();
    expect(screen.getByText(/AI-assisted extraction:/).textContent).toMatch(/off/);
    expect(screen.getByText(/Virus scanning: not configured/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing is published from an import/)).toBeInTheDocument();
  });
});

describe("CandidateReview", () => {
  it("shows sources with OCR reading confidence and the not-verified note", () => {
    render(<CandidateReview candidate={CANDIDATE} categories={CATEGORIES} images={IMAGES} onSaved={vi.fn()} confirm={vi.fn()} />);
    const brand = document.querySelector('[data-field="brand"]') as HTMLElement;
    fireEvent.click(within(brand).getByRole("button", { name: /Show source/ }));
    expect(within(brand).getByText(/OCR reading 81%/)).toBeInTheDocument();
    expect(within(brand).getByText(/not verified facts/)).toBeInTheDocument();
    expect(screen.getByText(/Fix before confirming/)).toBeInTheDocument();
    expect(screen.getByText(/Suggested: the brand and product name/)).toBeInTheDocument();
  });

  it("resolves a conflict by choosing a value, saving it with the loaded version, then confirming", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ ...CANDIDATE, updated_at: "2026-11-23T10:01:00Z" }))
      .mockResolvedValueOnce(json({ ...CANDIDATE, status: "CONFIRMED" }));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();
    render(<CandidateReview candidate={CANDIDATE} categories={CATEGORIES} images={IMAGES} onSaved={onSaved} confirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Use “21000”" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Use" }));
    fireEvent.click(screen.getByRole("radio", { name: /different product/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save and confirm" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/intake/candidates/c1");
    expect(JSON.parse(init.body)).toEqual({
      expected_updated_at: "2026-11-23T10:00:00Z",
      fields: { price_amount: "21000" },
      attach_to_identity_id: null,
      allow_similar: true,
      image_ids: ["img1"],
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain("/candidates/c1/confirm");
    expect(onSaved).toHaveBeenLastCalledWith(expect.objectContaining({ status: "CONFIRMED" }));
  });

  it("explains a server refusal and a stale edit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json({ detail: { code: "stale", message: "Someone changed this draft." } }, 409))
    );
    render(<CandidateReview candidate={CANDIDATE} categories={CATEGORIES} images={IMAGES} onSaved={vi.fn()} confirm={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^Brand/), { target: { value: "Scan Company" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Someone changed this draft after you opened it/)).toBeInTheDocument();
  });

  it("asks for confirmation before rejecting, and locks submitted drafts", () => {
    const confirm = vi.fn();
    const { rerender } = render(<CandidateReview candidate={CANDIDATE} categories={CATEGORIES} images={IMAGES} onSaved={vi.fn()} confirm={confirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Reject draft" }));
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Reject this draft?", danger: true }));
    rerender(
      <CandidateReview candidate={{ ...CANDIDATE, status: "SUBMITTED", identity_id: "i1" }} categories={CATEGORIES} images={IMAGES} onSaved={vi.fn()} confirm={confirm} />
    );
    expect(screen.getByText(/Submitted for approval/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirm draft|Save changes/ })).toBeNull();
    expect(screen.getByLabelText(/^Name/)).toBeDisabled();
  });
});
