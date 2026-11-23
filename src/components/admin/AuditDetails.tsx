import { FIELD_LABEL } from "@/lib/adminCatalog";

type Change = { from: unknown; to: unknown };

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "(empty)";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function isChanges(v: unknown): v is Record<string, Change> {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every((c) => !!c && typeof c === "object" && "from" in c && "to" in c)
  );
}

/** Audit `extra`: field changes as "Field: old → new", anything else as compact JSON. */
export function AuditDetails({ extra }: { extra: Record<string, unknown> | null }) {
  if (!extra || Object.keys(extra).length === 0) return null;
  const { changes, ...rest } = extra;
  const restKeys = Object.keys(rest).filter((k) => k !== "fields" || !isChanges(changes));
  return (
    <div className="space-y-1 text-xs">
      {isChanges(changes) && (
        <ul className="space-y-0.5">
          {Object.entries(changes).map(([field, c]) => (
            <li key={field}>
              <span className="font-semibold">{FIELD_LABEL[field] ?? field.replace(/_/g, " ")}:</span>{" "}
              <span className="text-brand-500 line-through decoration-brand-300">{show(c.from)}</span> → {show(c.to)}
            </li>
          ))}
        </ul>
      )}
      {restKeys.length > 0 && (
        <p className="font-mono text-brand-600">
          {JSON.stringify(Object.fromEntries(restKeys.map((k) => [k, rest[k]])))}
        </p>
      )}
    </div>
  );
}
