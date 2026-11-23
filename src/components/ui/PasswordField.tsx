"use client";

import { useState } from "react";

/** Password input with a show/hide toggle and an optional linked hint. */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  hint,
  invalid,
  describedBy,
  minLength,
  label = "Password",
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  invalid?: boolean;
  /** Extra element id(s) describing this field, e.g. a form error. */
  describedBy?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const described = [hintId, describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label !mb-0" htmlFor={id}>
          {label}
        </label>
        <button
          type="button"
          className="text-xs font-semibold text-brand-600 underline underline-offset-4"
          onClick={() => setVisible((v) => !v)}
          aria-controls={id}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <input
        id={id}
        type={visible ? "text" : "password"}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={described}
        minLength={minLength}
        required
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-brand-500">
          {hint}
        </p>
      )}
    </div>
  );
}
