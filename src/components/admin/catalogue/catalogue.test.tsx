import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuditDetails } from "@/components/admin/AuditDetails";
import type { AdminIdentity, AdminImage, IdentityFields } from "@/lib/adminCatalog";
import { EMPTY_FIELDS } from "@/lib/adminCatalog";
import { ConfirmDialog, ConfirmRequest } from "./ConfirmDialog";
import { sourceStatus } from "./FactsPanel";
import { FormOptions, IdentityForm, identityFormErrors } from "./IdentityForm";
import { ImageGallery } from "./ImageGallery";
import { actionsFor, ReviewPanel } from "./ReviewPanel";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

const OPTIONS: FormOptions = {
  categories: [
    { code: "skincare", label: "Skincare", parent_code: null, attribute_group: "skincare", sort_order: 0, is_active: true, product_count: 0 },
    { code: "serum", label: "Serum", parent_code: "skincare", attribute_group: "skincare", sort_order: 0, is_active: true, product_count: 0 },
    { code: "old_cat", label: "Old", parent_code: "skincare", attribute_group: "skincare", sort_order: 1, is_active: false, product_count: 0 },
    { code: "other_group", label: "Other", parent_code: null, attribute_group: "other", sort_order: 1, is_active: true, product_count: 0 },
    { code: "other", label: "Other", parent_code: "other_group", attribute_group: "other", sort_order: 0, is_active: true, product_count: 0 },
  ],
  specs: {
    skincare: { spf: { kind: "int", choices: [], min: 1, max: 100 }, fragrance_free: { kind: "bool", choices: [], min: null, max: null } },
    other: {},
  },
  skinTypes: [{ code: "dry", label: "Dry" }],
  concerns: [{ code: "dryness", label: "Dryness" }],
};

const FIELDS: IdentityFields = { ...EMPTY_FIELDS, name: "Night Serum", category: "serum", brand: "B", attributes: { spf: 30 } };

// ---------------------------------------------------------------- ConfirmDialog
describe("ConfirmDialog", () => {
  it("requires a reason before confirming and passes it on", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const req: ConfirmRequest = { title: "Reject?", body: "b", confirmLabel: "Reject", reasonLabel: "Why?", danger: true, onConfirm };
    render(<ConfirmDialog request={req} onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Reject?" });
    const button = within(dialog).getByRole("button", { name: "Reject" });
    expect(button).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Why?"), { target: { value: "  Counterfeit  " } });
    fireEvent.click(button);
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onConfirm).toHaveBeenCalledWith("Counterfeit");
  });

  it("keeps the dialog open and shows the error when the action fails", async () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        request={{ title: "Archive?", body: "b", confirmLabel: "Archive", onConfirm: () => Promise.reject(new Error("Product is archived")) }}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Product is archived");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape without confirming", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog request={{ title: "T", body: "b", confirmLabel: "Go", onConfirm }} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- IdentityForm
describe("IdentityForm", () => {
  it("explains missing required fields and does not submit", () => {
    const onSubmit = vi.fn();
    render(<IdentityForm initial={EMPTY_FIELDS} options={OPTIONS} mode="create" submitLabel="Create" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText(/Enter the product name/)).toBeInTheDocument();
    expect(screen.getByText(/Choose a subcategory/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(identityFormErrors({ ...FIELDS, skin_types: ["all", "dry"] }).skin_types).toMatch(/can’t be combined/);
  });

  it("sends only the changed fields when editing, and can discard", () => {
    const onSubmit = vi.fn();
    const onDirty = vi.fn();
    render(
      <IdentityForm initial={FIELDS} options={OPTIONS} mode="edit" submitLabel="Save" onSubmit={onSubmit} onDirtyChange={onDirty} />
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Pack size/), { target: { value: "30 mL" } });
    expect(onDirty).toHaveBeenLastCalledWith(true);
    expect(screen.getByText(/Unsaved changes: Pack size/)).toBeInTheDocument();
    fireEvent.click(save);
    expect(onSubmit.mock.calls[0][0]).toEqual({ size_label: "30 mL" });

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByLabelText(/Pack size/)).toHaveValue("");
  });

  it("offers only active categories and drops attributes the new category doesn't allow", () => {
    const onSubmit = vi.fn();
    render(<IdentityForm initial={FIELDS} options={OPTIONS} mode="edit" submitLabel="Save" onSubmit={onSubmit} />);
    const select = screen.getByLabelText(/^Category/);
    expect(within(select).queryByRole("option", { name: /Old/ })).toBeNull();
    expect(screen.getByLabelText(/spf/i)).toHaveValue("30");
    fireEvent.change(select, { target: { value: "other" } });
    expect(screen.queryByLabelText(/spf/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit.mock.calls[0][0]).toEqual({ category: "other", attributes: null });
  });
});

// ---------------------------------------------------------------- ReviewPanel
const IDENTITY = {
  id: "i1",
  name: "Night Serum",
  status: "PENDING_REVIEW",
  readiness: { can_publish: false, blockers: [{ code: "missing", field: "brand", message: "Brand is missing." }], warnings: [] },
  reviewed_at: null,
  reviewed_by_email: null,
} as unknown as AdminIdentity;

describe("ReviewPanel", () => {
  it("offers the actions each status allows", () => {
    expect(actionsFor("PENDING_REVIEW").map((a) => a.action)).toEqual(["publish", "return", "reject", "archive"]);
    expect(actionsFor("ARCHIVED").map((a) => a.action)).toEqual(["restore"]);
    expect(actionsFor("PUBLISHED").map((a) => a.action)).toEqual(["archive"]);
  });

  it("shows why it can't be published and disables approval", () => {
    render(<ReviewPanel identity={IDENTITY} history={[]} onChanged={vi.fn()} confirm={vi.fn()} blockedByUnsaved={false} />);
    expect(screen.getByText("Brand is missing.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve and publish" })).toBeDisabled();
  });

  it("returns for correction with the reason given in the dialog", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal("fetch", fetchMock);
    const onChanged = vi.fn();
    let request: ConfirmRequest | null = null;
    render(
      <ReviewPanel identity={IDENTITY} history={[]} onChanged={onChanged} confirm={(r) => (request = r)} blockedByUnsaved={false} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Return for correction" }));
    expect(request!.reasonLabel).toMatch(/What needs correcting/);
    await request!.onConfirm("Add the brand");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/catalog/identities/i1/return");
    expect(JSON.parse(init.body)).toEqual({ reason: "Add the brand" });
    expect(onChanged).toHaveBeenCalled();
  });

  it("blocks status changes while there are unsaved edits", () => {
    render(<ReviewPanel identity={IDENTITY} history={[]} onChanged={vi.fn()} confirm={vi.fn()} blockedByUnsaved />);
    expect(screen.getByRole("button", { name: "Return for correction" })).toBeDisabled();
  });
});

// ---------------------------------------------------------------- ImageGallery
const IMG = (id: string, position: number, primary = false): AdminImage =>
  ({
    id,
    identity_id: "i1",
    url: `/api/v1/catalog/images/${id}/file`,
    alt_text: `Photo ${id}`,
    position,
    is_primary: primary,
    width: 300,
    height: 300,
    source_type: "shop_supplied",
    storage_backend: "uploaded",
    storage_key: `i1/${id}.jpg`,
    content_type: "image/jpeg",
    byte_size: 2048,
    sha256: id,
    source_reference: null,
    licence_note: null,
    created_by: null,
    created_at: "",
  }) as AdminImage;

describe("ImageGallery", () => {
  it("refuses an unsupported file before uploading", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ImageGallery identityId="i1" images={[]} uploadsEnabled locked={false} onChanged={vi.fn()} confirm={vi.fn()} />);
    const file = new File(["GIF89a"], "anim.gif", { type: "image/gif" });
    fireEvent.change(screen.getByLabelText("Photo file"), { target: { files: [file] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG or WebP/);
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a new gallery order in one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([]));
    vi.stubGlobal("fetch", fetchMock);
    const onChanged = vi.fn();
    render(
      <ImageGallery identityId="i1" images={[IMG("a", 0, true), IMG("b", 1)]} uploadsEnabled locked={false} onChanged={onChanged} confirm={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Move photo 2 earlier" }));
    fireEvent.click(screen.getByRole("button", { name: "Save photo order" }));
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/identities/i1/images/order");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ image_ids: ["b", "a"] });
  });

  it("asks for confirmation before deleting", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const confirm = vi.fn();
    render(<ImageGallery identityId="i1" images={[IMG("a", 0, true)]} uploadsEnabled locked={false} onChanged={vi.fn()} confirm={confirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Delete this photo?", danger: true }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains when uploads are not configured and when the product is archived", () => {
    render(<ImageGallery identityId="i1" images={[IMG("a", 0, true)]} uploadsEnabled={false} locked onChanged={vi.fn()} confirm={vi.fn()} />);
    expect(screen.getByText(/uploads are switched off/)).toBeInTheDocument();
    expect(screen.getByText(/archived/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Photo file")).toBeNull();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});

// ---------------------------------------------------------------- sources and audit
describe("sources and audit details", () => {
  it("summarises whether a fact has a verified source", () => {
    const f = (field: string, verification_state: string) => ({ field, verification_state }) as never;
    expect(sourceStatus([f("brand", "unverified"), f("brand", "verified")], "brand")).toBe("verified");
    expect(sourceStatus([f("brand", "rejected")], "brand")).toBe("rejected");
    expect(sourceStatus([], "brand")).toBe("none");
  });

  it("renders field changes as old → new", () => {
    render(<AuditDetails extra={{ fields: ["size_label"], changes: { size_label: { from: "50 mL", to: "30 mL" } }, returned_to_draft: true }} />);
    expect(screen.getByText("Pack size:")).toBeInTheDocument();
    expect(screen.getByText("50 mL")).toBeInTheDocument();
    expect(screen.getByText(/returned_to_draft/)).toBeInTheDocument();
  });
});
