/**
 * Image area for a partner product.
 *
 * The catalogue API has no product photo field yet, so this never draws a
 * product. It shows the category in type with an explicit "no photo" note,
 * so no customer mistakes it for the real packaging.
 */
const TONES: Record<string, string> = {
  cleanser: "from-teal-50 to-teal-100",
  toner: "from-teal-50 to-[#E3EFE9]",
  serum: "from-gold-100 to-[#EBD9B9]",
  moisturizer: "from-brand-100 to-brand-200",
  sunscreen: "from-[#FBF0DC] to-gold-100",
  mask: "from-blush-50 to-blush-100",
  exfoliant: "from-blush-50 to-[#F2E4DA]",
  eye_care: "from-brand-100 to-blush-50",
};

export function ProductVisual({
  category,
  categoryLabel,
  size = "card",
}: {
  category: string;
  categoryLabel: string;
  size?: "card" | "detail";
}) {
  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${
        TONES[category] ?? "from-brand-100 to-brand-200"
      } ${size === "detail" ? "aspect-[4/3] sm:aspect-square" : "aspect-[16/9]"}`}
    >
      <div className="text-center">
        <p className={`display text-brand-700/80 ${size === "detail" ? "text-4xl" : "text-2xl"}`}>{categoryLabel}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-brand-500">No photo supplied yet</p>
      </div>
    </div>
  );
}
