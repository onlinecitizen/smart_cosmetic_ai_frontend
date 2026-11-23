/**
 * Beauty Studio assessment: question definitions, answer storage and
 * conversion to the existing recommendation request
 * (POST /api/v1/catalog/recommendations, method rules-v1).
 *
 * No new backend contract. Answers are kept in sessionStorage only (this
 * device, this tab) and are never sent anywhere except the recommendation
 * request the customer asks for.
 */
import {
  avoidListError,
  CatalogOptions,
  Option,
  parseAvoidList,
  RecommendationRequest,
  SkinTypeAnswer,
} from "./catalog";
import type { MessageKey } from "./i18n";

export type QuestionId = "skin_type" | "concerns" | "avoid_groups" | "avoid_ingredients" | "category";

export const QUESTION_ORDER: QuestionId[] = ["skin_type", "concerns", "avoid_groups", "avoid_ingredients", "category"];

export interface StudioAnswers {
  skin_type: SkinTypeAnswer | null;
  concerns: string[];
  avoid_groups: string[];
  avoid_text: string;
  category: string;
}

export const EMPTY_ANSWERS: StudioAnswers = {
  skin_type: null,
  concerns: [],
  avoid_groups: [],
  avoid_text: "",
  category: "",
};

export interface Question {
  id: QuestionId;
  kind: "single" | "multi" | "text";
  title: MessageKey;
  help: MessageKey;
  optional: boolean;
  options: (Option & { detail?: string })[];
}

/** Builds the five questions from the backend vocabulary. Labels for options come from the API. */
export function buildQuestions(options: CatalogOptions, notSureLabel: string, anyLabel: string): Question[] {
  return [
    {
      id: "skin_type",
      kind: "single",
      title: "assess.q.skin_type",
      help: "assess.h.skin_type",
      optional: false,
      options: [...options.skin_types, { code: "not_sure", label: notSureLabel }],
    },
    {
      id: "concerns",
      kind: "multi",
      title: "assess.q.concerns",
      help: "assess.h.concerns",
      optional: true,
      options: options.concerns,
    },
    {
      id: "avoid_groups",
      kind: "multi",
      title: "assess.q.avoid_groups",
      help: "assess.h.avoid_groups",
      optional: true,
      options: options.avoid_groups.map((g) => ({ code: g.code, label: g.label, detail: g.terms.join(", ") })),
    },
    {
      id: "avoid_ingredients",
      kind: "text",
      title: "assess.q.avoid_ingredients",
      help: "assess.h.avoid_ingredients",
      optional: true,
      options: [],
    },
    {
      id: "category",
      kind: "single",
      title: "assess.q.category",
      help: "assess.h.category",
      optional: true,
      options: [{ code: "", label: anyLabel }, ...options.categories],
    },
  ];
}

/** Returns an error message key/text when the question can't be left yet, otherwise null. */
export function questionError(id: QuestionId, answers: StudioAnswers): string | null {
  if (id === "skin_type" && !answers.skin_type) return "required";
  if (id === "avoid_ingredients") return avoidListError(parseAvoidList(answers.avoid_text));
  return null;
}

export function isComplete(answers: StudioAnswers): boolean {
  return QUESTION_ORDER.every((id) => questionError(id, answers) === null);
}

export function toRecommendationRequest(answers: StudioAnswers): RecommendationRequest {
  return {
    skin_type: answers.skin_type ?? "not_sure",
    concerns: answers.concerns,
    avoid_groups: answers.avoid_groups,
    avoid_ingredients: parseAvoidList(answers.avoid_text),
    category: answers.category || null,
  };
}

const STORAGE_KEY = "sca.studio.v1";

function sanitize(raw: unknown): StudioAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const skin = r.skin_type;
  return {
    skin_type:
      skin === "dry" || skin === "oily" || skin === "combination" || skin === "normal" || skin === "not_sure"
        ? skin
        : null,
    concerns: strings(r.concerns),
    avoid_groups: strings(r.avoid_groups),
    avoid_text: typeof r.avoid_text === "string" ? r.avoid_text.slice(0, 700) : "",
    category: typeof r.category === "string" ? r.category : "",
  };
}

export function loadAnswers(): StudioAnswers | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveAnswers(answers: StudioAnswers): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    /* storage unavailable: the flow still works within the page */
  }
}

export function clearAnswers(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Routine steps in a general order of use, keyed by catalogue category codes. */
export const ROUTINE_STEPS: { step: string; categories: string[] }[] = [
  { step: "Cleanse", categories: ["cleanser"] },
  { step: "Tone", categories: ["toner"] },
  { step: "Treat", categories: ["serum"] },
  { step: "Moisturise", categories: ["moisturizer"] },
  { step: "Protect (daytime)", categories: ["sunscreen"] },
  { step: "Extras", categories: ["mask", "exfoliant", "eye_care", "other"] },
];
