"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, ConfirmRequest } from "@/components/admin/catalogue/ConfirmDialog";
import { CatalogueNav } from "@/components/admin/catalogue/shared";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState, Spinner } from "@/components/ui/States";
import { AdminCategory, adminCatalogApi, adminError, AttributeSpecs, suggestCode } from "@/lib/adminCatalog";

function Row({
  cat,
  onChanged,
  confirm,
}: {
  cat: AdminCategory;
  onChanged: () => void;
  confirm: (r: ConfirmRequest) => void;
}) {
  const [label, setLabel] = useState(cat.label);
  const [order, setOrder] = useState(String(cat.sort_order));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = label.trim() !== cat.label || order !== String(cat.sort_order);

  async function save() {
    if (!label.trim()) return setError("The name can’t be empty.");
    if (!/^\d+$/.test(order)) return setError("Order must be a whole number.");
    setBusy(true);
    setError(null);
    try {
      await adminCatalogApi.updateCategory(cat.code, { label: label.trim(), sort_order: Number(order) });
      onChanged();
    } catch (err) {
      setError(adminError(err, "Could not save the category."));
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    const retiring = cat.is_active;
    confirm({
      title: retiring ? `Retire “${cat.label}”?` : `Reactivate “${cat.label}”?`,
      body: retiring
        ? "It disappears from the shop’s filters and can’t be chosen for products. Only possible when no product that isn’t archived uses it. You can reactivate it later."
        : "It becomes available again in the shop’s filters and the product form.",
      confirmLabel: retiring ? "Retire" : "Reactivate",
      danger: retiring,
      onConfirm: async () => {
        try {
          await adminCatalogApi.updateCategory(cat.code, { is_active: !retiring });
        } catch (err) {
          throw new Error(adminError(err, "Could not change the category."));
        }
        onChanged();
      },
    });
  }

  const isGroup = cat.parent_code === null;
  return (
    <tr className={`border-b border-brand-50 align-top ${isGroup ? "bg-brand-50/60" : ""}`}>
      <td className={`py-2 pr-3 ${isGroup ? "" : "pl-6"}`}>
        <input
          aria-label={`Name of ${cat.code}`}
          className="input max-w-[14rem]"
          value={label}
          maxLength={80}
          onChange={(e) => setLabel(e.target.value)}
        />
        <span className="block font-mono text-xs text-brand-500">{cat.code}</span>
        {error && (
          <span role="alert" className="block text-xs text-red-700">
            {error}
          </span>
        )}
      </td>
      <td className="py-2 pr-3">
        <input
          aria-label={`Order of ${cat.code}`}
          className="input w-16"
          inputMode="numeric"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        />
      </td>
      <td className="py-2 pr-3 text-xs">{cat.attribute_group}</td>
      <td className="py-2 pr-3">{cat.product_count}</td>
      <td className="py-2 pr-3 text-xs">{cat.is_active ? "Active" : <span className="text-amber-900">Retired</span>}</td>
      <td className="space-x-3 whitespace-nowrap py-2 text-xs">
        <button type="button" className="text-brand-700 underline" disabled={!dirty || busy} onClick={save}>
          Save
        </button>
        <button type="button" className={cat.is_active ? "text-red-700 underline" : "text-brand-700 underline"} onClick={toggle}>
          {cat.is_active ? "Retire" : "Reactivate"}
        </button>
      </td>
    </tr>
  );
}

function AddCategory({
  groups,
  specs,
  onDone,
}: {
  groups: AdminCategory[];
  specs: AttributeSpecs;
  onDone: () => void;
}) {
  const [parent, setParent] = useState("");
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [attr, setAttr] = useState("other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return setError("Enter a name.");
    if (!/^[a-z][a-z0-9_]{1,31}$/.test(code)) return setError("The code must be 2–32 lower-case letters, digits or _, starting with a letter.");
    setBusy(true);
    setError(null);
    try {
      await adminCatalogApi.createCategory(
        parent ? { code, label: label.trim(), parent_code: parent } : { code, label: label.trim(), attribute_group: attr }
      );
      setLabel("");
      setCode("");
      setCodeTouched(false);
      onDone();
    } catch (err) {
      setError(adminError(err, "Could not add the category."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="card space-y-3" aria-label="Add a category">
      <h2 className="font-semibold text-brand-900">Add a category</h2>
      <p className="text-xs text-brand-500">
        The code is permanent (products refer to it); the name can be changed later. A subcategory uses its group’s
        attributes.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="label">Group</span>
          <select className="input" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">— New top-level group —</option>
            {groups.map((g) => (
              <option key={g.code} value={g.code} disabled={!g.is_active}>
                Subcategory of {g.label}
                {g.is_active ? "" : " (retired)"}
              </option>
            ))}
          </select>
        </label>
        {!parent && (
          <label className="block text-sm">
            <span className="label">Attributes</span>
            <select className="input" value={attr} onChange={(e) => setAttr(e.target.value)}>
              {Object.keys(specs).map((g) => (
                <option key={g} value={g}>
                  {g.replace(/_/g, " ")} ({Object.keys(specs[g]).length} attributes)
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm">
          <span className="label">Name</span>
          <input
            className="input"
            value={label}
            maxLength={80}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!codeTouched) setCode(suggestCode(e.target.value));
            }}
          />
        </label>
        <label className="block text-sm">
          <span className="label">Code</span>
          <input
            className="input font-mono"
            value={code}
            maxLength={32}
            onChange={(e) => {
              setCodeTouched(true);
              setCode(e.target.value);
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}

function Categories() {
  const [cats, setCats] = useState<AdminCategory[] | null>(null);
  const [specs, setSpecs] = useState<AttributeSpecs>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([adminCatalogApi.categories(), adminCatalogApi.attributeSpecs()])
      .then(([c, s]) => {
        setCats(c);
        setSpecs(s);
      })
      .catch((err) => setError(adminError(err, "Could not load the categories.")));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="container-page space-y-6">
      <h1 className="display text-4xl">Categories</h1>
      <CatalogueNav />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !cats ? (
        <Spinner label="Loading categories" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Category groups and subcategories</caption>
              <thead>
                <tr className="border-b border-brand-100 text-left text-brand-500">
                  <th className="py-2 pr-3">Name and code</th>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Attributes</th>
                  <th className="py-2 pr-3">Products</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <Row key={`${c.code}-${c.label}-${c.sort_order}-${c.is_active}`} cat={c} onChanged={load} confirm={setConfirmReq} />
                ))}
              </tbody>
            </table>
          </div>
          <AddCategory groups={cats.filter((c) => c.parent_code === null)} specs={specs} onDone={load} />
        </>
      )}
      <ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <RequireAuth adminOnly>
      <Categories />
    </RequireAuth>
  );
}
