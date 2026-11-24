"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageLoader } from "@/components/PageLoader";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert } from "@/components/ui/States";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AVAILABILITY_LABEL, CatalogProduct, catalogApi } from "@/lib/catalog";
import {
  ContactMethod,
  Fulfilment,
  MAX_QUANTITY,
  isDefinitiveRejection,
  newClientRequestId,
  orderErrorMessage,
  orderRequestApi,
  phoneError,
} from "@/lib/orderRequests";
import { formatPrice } from "@/lib/product";

const OPTION_CLASS =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-brand-200 bg-white/70 px-3 text-sm has-[:checked]:border-brand-900";

function initialQuantity(): number {
  if (typeof window === "undefined") return 1;
  const n = Number(new URLSearchParams(window.location.search).get("quantity"));
  return Number.isInteger(n) && n >= 1 && n <= MAX_QUANTITY ? n : 1;
}

function RequestForm() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("whatsapp");
  const [fulfilment, setFulfilment] = useState<Fulfilment>("pickup");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showMyRequests, setShowMyRequests] = useState(false);
  // One id per request attempt: resending after a timeout or double-click
  // returns the same stored request instead of creating a duplicate.
  const clientRequestId = useRef(newClientRequestId());

  useEffect(() => setQuantity(initialQuantity()), []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setProduct(await catalogApi.get(id));
    } catch (err) {
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? "This product isn’t available to request. It may have been removed."
          : errorMessage(err, "We couldn’t load this product.")
      );
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!product) return <PageLoader message={loadError} onRetry={load} />;

  const errors = {
    name: name.trim().length < 2 ? "Enter your name." : null,
    phone: phoneError(phone),
    address: fulfilment === "delivery" && address.trim().length < 5 ? "Enter a delivery address or area." : null,
    consent: consent ? null : `Tick the box to let us share your details with ${product.retailer.name}.`,
  };
  const invalid = Object.values(errors).some(Boolean);
  const outOfStock = product.availability === "out_of_stock";
  const priced = product.price_amount != null && product.currency;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (invalid || submitting || !product) return;
    setSubmitting(true);
    setSubmitError(null);
    setShowMyRequests(false);
    try {
      const created = await orderRequestApi.create({
        client_request_id: clientRequestId.current,
        items: [{ product_id: product.id, quantity }],
        customer_name: name.trim(),
        customer_phone: phone,
        contact_method: contactMethod,
        fulfilment,
        delivery_address: fulfilment === "delivery" ? address.trim() : null,
        notes: notes.trim() || null,
        consent_to_share: consent,
      });
      router.push(`/order-requests/${created.id}`);
    } catch (err) {
      if (isDefinitiveRejection(err)) clientRequestId.current = newClientRequestId();
      if (err instanceof ApiError && err.status === 409 && String(err.detail).includes("different details")) {
        setShowMyRequests(true);
      }
      setSubmitError(orderErrorMessage(err, "We couldn’t send your request. Please try again."));
      setSubmitting(false);
    }
  }

  const fieldError = (msg: string | null, fieldId: string) =>
    touched && msg ? (
      <p id={`${fieldId}-error`} className="field-error">
        {msg}
      </p>
    ) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-6">
      <Link
        href={`/products/${product.id}`}
        className="text-xs uppercase tracking-[0.2em] text-brand-600 hover:text-brand-900"
      >
        ← Back to product
      </Link>
      <h1 className="display mt-6 text-4xl">Request this product</h1>

      <Alert tone="info" className="mt-6" title="This is a request, not a confirmed order">
        We pass your request to {product.retailer.name}, who confirms availability, the final price, and payment and
        collection or delivery with you. Nothing is charged and no payment is taken on this website.
      </Alert>
      {product.is_test_fixture && (
        <Alert tone="warning" className="mt-4">
          This is a demo listing, not sold by a partner shop. Any request for it is test data only.
        </Alert>
      )}

      <section className="card mt-6" aria-label="Product">
        <p className="font-semibold text-brand-900">{product.name}</p>
        <p className="text-sm text-brand-600">
          {[product.brand, product.size_label].filter(Boolean).join(" · ") || "Brand and size not provided"} · Sold by{" "}
          {product.retailer.name}
        </p>
        <p className="mt-2 text-sm text-brand-600">{AVAILABILITY_LABEL[product.availability] ?? product.availability}</p>
      </section>

      {outOfStock ? (
        <Alert tone="warning" className="mt-6">
          {product.retailer.name} lists this product as out of stock, so it can’t be requested right now.
        </Alert>
      ) : (
        <form noValidate onSubmit={submit} className="mt-6 space-y-6">
          <div className="card">
            <label htmlFor="quantity" className="label">
              Quantity
            </label>
            <div className="mt-1 w-28">
              <select
                id="quantity"
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              >
                {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-3 text-sm text-brand-700">
              {priced
                ? `Listed price: ${formatPrice(product.price_amount! * quantity, product.currency)} (${quantity} × ${formatPrice(product.price_amount, product.currency)}). The retailer confirms the final price.`
                : "Price not provided. The retailer will tell you the price before you pay."}
            </p>
          </div>

          <fieldset className="card space-y-4">
            <legend className="px-1 font-semibold text-brand-900">How can the retailer reach you?</legend>
            <div>
              <label htmlFor="name" className="label">
                Your name
              </label>
              <input
                id="name"
                className="input"
                autoComplete="name"
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={touched && !!errors.name}
                aria-describedby={touched && errors.name ? "name-error" : undefined}
              />
              {fieldError(errors.name, "name")}
            </div>
            <div>
              <label htmlFor="phone" className="label">
                Phone number, with country code
              </label>
              <input
                id="phone"
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+255 7XX XXX XXX"
                maxLength={24}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={touched && !!errors.phone}
                aria-describedby={touched && errors.phone ? "phone-error" : undefined}
              />
              {fieldError(errors.phone, "phone")}
            </div>
            <div role="radiogroup" aria-label="Preferred contact method" className="grid grid-cols-2 gap-2">
              {(
                [
                  ["whatsapp", "WhatsApp"],
                  ["phone", "Phone call"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className={OPTION_CLASS}>
                  <input
                    type="radio"
                    name="contact_method"
                    checked={contactMethod === value}
                    onChange={() => setContactMethod(value)}
                    className="accent-brand-900"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="card space-y-4">
            <legend className="px-1 font-semibold text-brand-900">Collection or delivery</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["pickup", "I’ll collect it"],
                  ["delivery", "Please deliver"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className={OPTION_CLASS}>
                  <input
                    type="radio"
                    name="fulfilment"
                    checked={fulfilment === value}
                    onChange={() => setFulfilment(value)}
                    className="accent-brand-900"
                  />
                  {label}
                </label>
              ))}
            </div>
            {fulfilment === "delivery" && (
              <div>
                <label htmlFor="address" className="label">
                  Delivery address or area
                </label>
                <textarea
                  id="address"
                  className="input"
                  rows={2}
                  maxLength={300}
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  aria-invalid={touched && !!errors.address}
                  aria-describedby={touched && errors.address ? "address-error" : undefined}
                />
                {fieldError(errors.address, "address")}
                <p className="mt-1 text-xs text-brand-500">
                  The retailer confirms whether they deliver to you and any delivery cost.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="notes" className="label">
                Notes for the retailer (optional)
              </label>
              <textarea
                id="notes"
                className="input"
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </fieldset>

          <div className="card">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-brand-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 accent-brand-900"
                aria-invalid={touched && !!errors.consent}
                aria-describedby={touched && errors.consent ? "consent-error" : undefined}
              />
              <span>
                Share my name, phone number and the details above with {product.retailer.name} so they can respond to
                this request.
              </span>
            </label>
            {fieldError(errors.consent, "consent")}
          </div>

          {submitError && (
            <Alert tone="error">
              {submitError}
              {showMyRequests && (
                <>
                  {" "}
                  <Link href="/order-requests" className="font-semibold underline underline-offset-4">
                    Go to My requests
                  </Link>
                </>
              )}
            </Alert>
          )}

          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
            {submitting ? "Sending request…" : "Send request"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function RequestProductPage() {
  return (
    <RequireAuth>
      <RequestForm />
    </RequireAuth>
  );
}
