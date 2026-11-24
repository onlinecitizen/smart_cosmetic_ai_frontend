/**
 * Beauty Assistant API (backend docs/assistant.md). Types mirror
 * backend app/assistant/service.py. The browser never talks to an AI service:
 * every message goes to our backend, which returns structured needs and
 * products from the reviewed catalogue only.
 */
import { api } from "./api";
import type { CatalogProduct } from "./catalog";

export type AssistantLang = "en" | "sw";

export interface BeautyProfile {
  focus: string[];
  skin_type: string | null;
  skin_concerns: string[];
  hair_types: string[];
  hair_concerns: string[];
  categories: string[];
  budget_max: number | null;
  budget_currency: string | null;
  avoid_groups: string[];
  avoid_ingredients: string[];
  require_sulfate_free: boolean;
  require_silicone_free: boolean;
  in_stock_only: boolean;
}

export const EMPTY_PROFILE: BeautyProfile = {
  focus: [],
  skin_type: null,
  skin_concerns: [],
  hair_types: [],
  hair_concerns: [],
  categories: [],
  budget_max: null,
  budget_currency: null,
  avoid_groups: [],
  avoid_ingredients: [],
  require_sulfate_free: false,
  require_silicone_free: false,
  in_stock_only: false,
};

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  slot: string;
  text: string;
  options: QuestionOption[];
  multi: boolean;
  free_text?: boolean;
}

export interface Reason {
  text: string;
  field: string;
  basis: "verified" | "reviewed" | "shop";
  basis_label: string;
}

export interface RecommendedItem {
  product: CatalogProduct;
  identity_id: string | null;
  product_url: string;
  request_url: string;
  score: number;
  reasons: Reason[];
  cautions: string[];
}

export interface Recommendations {
  method: string;
  items: RecommendedItem[];
  excluded: { product_id: string; name: string; brand: string | null; retailer_name: string; reasons: string[] }[];
  excluded_count: number;
  exclusion_counts: Record<string, number>;
  evaluated_count: number;
  not_matched_count: number;
  message: string;
  limitations: string[];
  disclaimer: string;
}

export interface AssistantTurn {
  conversation_id: string;
  version: number;
  language: AssistantLang;
  language_is_draft: boolean;
  status: "gathering" | "review" | "confirmed";
  reply: string[];
  safety: { code: string; text: string }[];
  question: Question | null;
  profile: BeautyProfile;
  profile_summary: string[];
  answered: string[];
  can_confirm: boolean;
  recommendations: Recommendations | null;
  parser: string | null;
  disclaimer: string;
}

export interface LabelOption {
  code: string;
  label: string;
}

export interface AssistantConfig {
  languages: AssistantLang[];
  kiswahili_is_draft: boolean;
  ai_parsing: boolean;
  max_message_chars: number;
  retention_days: number;
  options: {
    focus: LabelOption[];
    skin_types: LabelOption[];
    skin_concerns: LabelOption[];
    hair_types: LabelOption[];
    hair_concerns: LabelOption[];
    avoid_groups: LabelOption[];
    categories: (LabelOption & { children: LabelOption[] })[];
    currencies: string[];
    feedback_reasons: string[];
  };
}

const BASE = "/api/v1/assistant";
const conv = (id: string) => `${BASE}/conversations/${encodeURIComponent(id)}`;

export const assistantApi = {
  config: (language: AssistantLang) => api.get<AssistantConfig>(`${BASE}/config?language=${language}`),
  start: (language: AssistantLang) => api.post<AssistantTurn>(`${BASE}/conversations`, { language }),
  get: (id: string) => api.get<AssistantTurn>(conv(id)),
  say: (id: string, text: string, version: number) =>
    api.post<AssistantTurn>(`${conv(id)}/messages`, { text, version }),
  choose: (id: string, slot: string, values: string[], version: number) =>
    api.post<AssistantTurn>(`${conv(id)}/messages`, { choice: { slot, values }, version }),
  editProfile: (id: string, profile: BeautyProfile, version: number) =>
    api.put<AssistantTurn>(`${conv(id)}/profile`, { profile, version }),
  confirm: (id: string, version: number) => api.post<AssistantTurn>(`${conv(id)}/confirm`, { version }),
  remove: (id: string) => api.del(conv(id)),
  feedback: (body: {
    conversation_id: string;
    helpful: boolean;
    reason?: string;
    comment?: string;
    product_ids: string[];
  }) => api.post<{ id: string }>(`${BASE}/feedback`, body),
};

/** Interface text. Kiswahili is a draft until a native speaker reviews it. */
const UI = {
  en: {
    title: "Beauty Assistant",
    intro: "Tell me what you're looking for. I'll ask a few questions, show you what I understood, and only then suggest products from our reviewed catalogue.",
    you: "You",
    assistant: "Assistant",
    placeholder: "Type your message…",
    send: "Send",
    sending: "Sending…",
    yourNeeds: "Your needs",
    needsHelp: "Check what I understood. Change anything that's wrong, then confirm.",
    nothingYet: "Nothing yet. Tell me about your skin, hair or the product you want.",
    edit: "Edit",
    save: "Save changes",
    cancel: "Cancel",
    confirm: "Confirm and show products",
    results: "Suggested products",
    why: "Why it was chosen",
    cautions: "Check",
    view: "View details",
    request: "Request this product",
    leftOut: "Left out",
    limitations: "How this works",
    newChat: "Start over",
    deleteChat: "Delete this conversation",
    deleted: "Conversation deleted.",
    helpful: "Were these suggestions helpful?",
    yes: "Yes",
    no: "No",
    thanks: "Thank you for your feedback.",
    commentLabel: "What was missing? (optional, don't include personal or health details)",
    sendFeedback: "Send feedback",
    draftNotice: "Kiswahili replies are a draft and are still being reviewed.",
    privacy: "We don't store your messages. We keep only the needs shown on the right, for {days} days, so you can come back. You can delete them at any time.",
    focus: "Shopping for",
    skinType: "Skin type",
    notStated: "Not stated",
    skinConcerns: "Skin: help with",
    hairTypes: "Hair type",
    hairConcerns: "Hair: help with",
    categories: "Product types",
    avoidGroups: "Avoid these ingredient groups",
    avoidIngredients: "Other ingredients to avoid (comma separated)",
    sulfateFree: "Must be stated sulfate-free",
    siliconeFree: "Must be stated silicone-free",
    inStock: "In stock only",
    budget: "Most per product",
    noLimit: "No limit",
    currency: "Currency",
    language: "Language",
    languageRestart: "Changing the language starts a new conversation.",
    reason_wrong_products: "Products didn't fit",
    reason_missed_need: "Missed something I asked for",
    reason_ignored_avoidance: "Included something I avoid",
    reason_too_expensive: "Too expensive",
    reason_language: "Language problem",
    reason_other: "Other",
  },
  sw: {
    title: "Msaidizi wa Urembo",
    intro: "Niambie unachotafuta. Nitauliza maswali machache, nitakuonyesha nilichoelewa, kisha tu nitapendekeza bidhaa kutoka katalogi yetu iliyokaguliwa.",
    you: "Wewe",
    assistant: "Msaidizi",
    placeholder: "Andika ujumbe wako…",
    send: "Tuma",
    sending: "Inatuma…",
    yourNeeds: "Mahitaji yako",
    needsHelp: "Angalia nilichoelewa. Rekebisha kilichokosewa, kisha thibitisha.",
    nothingYet: "Bado hakuna. Niambie kuhusu ngozi, nywele au bidhaa unayotaka.",
    edit: "Hariri",
    save: "Hifadhi mabadiliko",
    cancel: "Ghairi",
    confirm: "Thibitisha na uonyeshe bidhaa",
    results: "Bidhaa zinazopendekezwa",
    why: "Kwa nini imechaguliwa",
    cautions: "Angalia",
    view: "Angalia maelezo",
    request: "Omba bidhaa hii",
    leftOut: "Hazikuonyeshwa",
    limitations: "Jinsi inavyofanya kazi",
    newChat: "Anza upya",
    deleteChat: "Futa mazungumzo haya",
    deleted: "Mazungumzo yamefutwa.",
    helpful: "Je, mapendekezo haya yamekusaidia?",
    yes: "Ndiyo",
    no: "Hapana",
    thanks: "Asante kwa maoni yako.",
    commentLabel: "Nini kilikosekana? (si lazima; usiandike taarifa binafsi au za afya)",
    sendFeedback: "Tuma maoni",
    draftNotice: "Majibu ya Kiswahili ni rasimu na bado yanakaguliwa.",
    privacy: "Hatuhifadhi jumbe zako. Tunahifadhi mahitaji yaliyoonyeshwa kulia tu, kwa siku {days}, ili uweze kurudi. Unaweza kuyafuta wakati wowote.",
    focus: "Unanunua",
    skinType: "Aina ya ngozi",
    notStated: "Haijatajwa",
    skinConcerns: "Ngozi: msaada kwa",
    hairTypes: "Aina ya nywele",
    hairConcerns: "Nywele: msaada kwa",
    categories: "Aina za bidhaa",
    avoidGroups: "Epuka makundi haya ya viambato",
    avoidIngredients: "Viambato vingine vya kuepuka (tenganisha kwa koma)",
    sulfateFree: "Lazima ielezwe kuwa bila salfeti",
    siliconeFree: "Lazima ielezwe kuwa bila silikoni",
    inStock: "Zilizopo stoo tu",
    budget: "Kiwango cha juu kwa bidhaa",
    noLimit: "Hakuna kikomo",
    currency: "Sarafu",
    language: "Lugha",
    languageRestart: "Kubadilisha lugha kunaanza mazungumzo mapya.",
    reason_wrong_products: "Bidhaa hazikufaa",
    reason_missed_need: "Kimekosa nilichoomba",
    reason_ignored_avoidance: "Imejumuisha ninachoepuka",
    reason_too_expensive: "Ghali sana",
    reason_language: "Tatizo la lugha",
    reason_other: "Nyingine",
  },
} as const;

export type UiKey = keyof (typeof UI)["en"];

export function ui(lang: AssistantLang, key: UiKey, vars?: Record<string, string | number>): string {
  let text: string = UI[lang]?.[key] ?? UI.en[key];
  for (const [k, v] of Object.entries(vars ?? {})) text = text.replace(`{${k}}`, String(v));
  return text;
}

export function toggle(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

/** "lanolin, Essential oil,, x" -> ["lanolin", "essential oil"] (3-60 chars, max 10, no duplicates). */
export function parseIngredients(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[,\n]/)) {
    const t = raw.trim().replace(/\s+/g, " ").toLowerCase();
    if (t.length >= 3 && t.length <= 60 && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 10);
}

/** A budget field: whole positive number or null. "30,000" -> 30000. */
export function parseBudget(text: string): number | null {
  const digits = text.replace(/[\s,]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return n >= 1 ? n : null;
}

/** Only links that stay on this site's product pages are rendered. */
export function safeProductHref(url: string): string | null {
  return /^\/products\/[A-Za-z0-9-]+(\/request)?$/.test(url) ? url : null;
}
