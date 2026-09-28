"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { api, Ingredient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SEEDED_INGREDIENTS } from "@/lib/product";

type Card = { code: string; name: string; description: string | null };

/** Ingredient cards from the live catalog when signed in, else the seeded catalog. */
export function IngredientShowcase() {
  const { user } = useAuth();
  const [items, setItems] = useState<Card[]>(SEEDED_INGREDIENTS);

  useEffect(() => {
    if (!user) return;
    api
      .get<Ingredient[]>("/api/v1/ingredients")
      .then((list) => {
        const active = list.filter((i) => i.status === "ACTIVE");
        if (active.length) setItems(active);
      })
      .catch(() => undefined);
  }, [user]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((ing, i) => (
        <Reveal key={ing.code} delay={i * 120}>
          <article className="group h-full rounded-3xl border border-brand-200/70 bg-white/60 p-6 shadow-soft transition duration-500 hover:-translate-y-1 hover:shadow-lift">
            <div className="mb-10 flex items-center justify-between">
              <span className="font-display text-sm italic text-gold-700">No. {String(i + 1).padStart(2, "0")}</span>
              <span className="h-10 w-10 rounded-full bg-gradient-to-br from-gold-100 via-white to-gold-300 shadow-inner transition duration-700 group-hover:scale-110" />
            </div>
            <h3 className="display text-2xl">{ing.name}</h3>
            {ing.description && <p className="mt-3 text-sm leading-relaxed text-brand-500">{ing.description}</p>}
          </article>
        </Reveal>
      ))}
    </div>
  );
}
