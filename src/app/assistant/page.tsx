"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssistantResults } from "@/components/assistant/AssistantResults";
import { ProfileEditor } from "@/components/assistant/ProfileEditor";
import { SpokenReplyControls, useSpokenReplies, VoiceInput } from "@/components/assistant/VoiceControls";
import { RequireAuth } from "@/components/RequireAuth";
import { Alert, ErrorState, Spinner } from "@/components/ui/States";
import { ApiError, errorMessage } from "@/lib/api";
import { AssistantConfig, AssistantLang, assistantApi, AssistantTurn, BeautyProfile, ui } from "@/lib/assistant";
import { TranscribeResult, VoiceConfig, voiceApi } from "@/lib/voice";

interface Bubble {
  id: number;
  from: "you" | "assistant";
  lines: string[];
  safety?: { code: string; text: string }[];
}

function friendly(err: unknown, lang: AssistantLang): string {
  if (err instanceof ApiError && (err.status === 409 || err.status === 422) && typeof err.detail === "string") {
    return err.detail;
  }
  return errorMessage(err, lang === "sw" ? "Kuna tatizo. Tafadhali jaribu tena." : "Something went wrong. Please try again.");
}

function Assistant() {
  const router = useRouter();
  const resumeId = useSearchParams().get("c");
  const [lang, setLang] = useState<AssistantLang>("en");
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [turn, setTurn] = useState<AssistantTurn | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const counter = useRef(0);
  const logEnd = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [voice, setVoice] = useState<VoiceConfig | null>(null);
  const [voiceNote, setVoiceNote] = useState<{ text: string; low: boolean } | null>(null);
  const spoken = useSpokenReplies(lang, voice, turn?.conversation_id ?? null, turn?.version ?? null);

  useEffect(() => {
    voiceApi
      .config()
      .then(setVoice)
      .catch(() => setVoice(null)); // voice is optional; text always works
  }, []);

  const onTranscript = useCallback((r: TranscribeResult) => {
    setText(r.transcript);
    setVoiceNote({ text: r.message, low: r.low_confidence });
    inputRef.current?.focus();
  }, []);

  const push = (from: Bubble["from"], lines: string[], safety?: Bubble["safety"]) =>
    setBubbles((b) => [...b, { id: ++counter.current, from, lines, safety }]);

  const absorb = useCallback((t: AssistantTurn, echo = true) => {
    setTurn(t);
    setLang(t.language);
    const lines = [...t.reply, ...(t.question ? [t.question.text] : [])];
    if (echo && (lines.length || t.safety.length)) push("assistant", lines, t.safety);
  }, []);

  const begin = useCallback(
    async (language: AssistantLang) => {
      setFatal(null);
      setBubbles([]);
      try {
        const t = await assistantApi.start(language);
        absorb(t);
        router.replace(`/assistant?c=${encodeURIComponent(t.conversation_id)}`);
      } catch (err) {
        setFatal(friendly(err, language));
      }
    },
    [absorb, router]
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (resumeId) {
      assistantApi
        .get(resumeId)
        .then((t) => {
          absorb(t, false);
          push("assistant", [ui(t.language, "needsHelp")]);
        })
        .catch(() => begin("en"));
    } else {
      begin("en");
    }
  }, [resumeId, absorb, begin]);

  useEffect(() => {
    assistantApi
      .config(lang)
      .then(setConfig)
      .catch((err) => setFatal(friendly(err, lang)));
  }, [lang]);

  useEffect(() => {
    logEnd.current?.scrollIntoView?.({ block: "nearest" });
  }, [bubbles]);

  const categoryLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of config?.options.categories ?? []) for (const c of g.children) map.set(c.code, c.label);
    return (code: string) => map.get(code) ?? code.replace(/_/g, " ");
  }, [config]);

  async function run(action: () => Promise<AssistantTurn>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      absorb(await action());
    } catch (err) {
      setError(friendly(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || !turn) return;
    push("you", [message]);
    setText("");
    setVoiceNote(null);
    spoken.stop(); // a new message interrupts the reply being read
    await run(() => assistantApi.say(turn.conversation_id, message, turn.version));
  }

  async function choose(values: string[], labels: string[]) {
    if (!turn?.question) return;
    push("you", [labels.join(", ")]);
    await run(() => assistantApi.choose(turn.conversation_id, turn.question!.slot, values, turn.version));
  }

  async function save(profile: BeautyProfile) {
    if (!turn) return;
    try {
      const t = await assistantApi.editProfile(turn.conversation_id, profile, turn.version);
      absorb(t);
      setEditing(false);
    } catch (err) {
      throw new Error(friendly(err, lang));
    }
  }

  async function remove() {
    if (!turn) return;
    try {
      await assistantApi.remove(turn.conversation_id);
      setTurn(null);
      setNotice(ui(lang, "deleted"));
      await begin(lang);
    } catch (err) {
      setError(friendly(err, lang));
    }
  }

  if (fatal) return <ErrorState message={fatal} onRetry={() => begin(lang)} />;
  if (!turn || !config) return <Spinner label="Loading the assistant" />;

  const q = turn.question;
  const languages = config.languages;

  return (
    <div className="container-page space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="display text-4xl">{ui(lang, "title")}</h1>
          {languages.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              {ui(lang, "language")}
              <select
                title={ui(lang, "languageRestart")}
                className="input !w-auto"
                value={lang}
                onChange={(e) => begin(e.target.value as AssistantLang)}
                aria-label={ui(lang, "language")}
              >
                <option value="en">English</option>
                <option value="sw">Kiswahili</option>
              </select>
            </label>
          )}
        </div>
        <p className="max-w-2xl text-sm text-brand-700">{ui(lang, "intro")}</p>
        {turn.language_is_draft && <Alert tone="warning">{ui(lang, "draftNotice")}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <SpokenReplyControls lang={lang} spoken={spoken} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card flex min-h-[420px] flex-col !p-0" aria-label={ui(lang, "title")}>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
            {bubbles.map((b) => (
              <div key={b.id} className={b.from === "you" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm ${
                    b.from === "you" ? "bg-brand-900 text-white" : "bg-brand-50 text-brand-900"
                  }`}
                >
                  <span className="sr-only">{ui(lang, b.from === "you" ? "you" : "assistant")}: </span>
                  {b.safety?.map((s) => (
                    <Alert key={s.code} tone={s.code === "urgent" ? "error" : "warning"}>
                      {s.text}
                    </Alert>
                  ))}
                  {b.lines.map((l, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {l}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            <div ref={logEnd} />
          </div>
          {q && q.options.length > 0 && (
            <QuickReplies key={`${turn.version}-${q.slot}`} question={q} disabled={busy} lang={lang} onChoose={choose} />
          )}
          <form onSubmit={send} className="flex gap-2 border-t border-brand-100 p-3">
            <label htmlFor="assistant-input" className="sr-only">
              {ui(lang, "placeholder")}
            </label>
            <input
              ref={inputRef}
              id="assistant-input"
              className="input flex-1"
              value={text}
              maxLength={config.max_message_chars}
              placeholder={ui(lang, "placeholder")}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
            <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
              {busy ? ui(lang, "sending") : ui(lang, "send")}
            </button>
          </form>
          {voiceNote && (
            <div className="px-3 pb-2">
              <Alert tone={voiceNote.low ? "warning" : "info"}>{voiceNote.text}</Alert>
            </div>
          )}
          {voice && (
            <VoiceInput
              lang={lang}
              config={voice}
              disabled={busy}
              onTranscript={onTranscript}
              onTypeInstead={() => inputRef.current?.focus()}
              onRecordingStart={spoken.stop}
            />
          )}
          {error && (
            <div className="px-3 pb-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
        </section>

        <aside className="card space-y-3" aria-labelledby="needs-heading">
          <div className="flex items-center justify-between gap-2">
            <h2 id="needs-heading" className="text-xl font-semibold text-brand-900">
              {ui(lang, "yourNeeds")}
            </h2>
            {!editing && (
              <button type="button" className="text-sm underline" onClick={() => setEditing(true)}>
                {ui(lang, "edit")}
              </button>
            )}
          </div>
          {editing ? (
            <ProfileEditor lang={lang} profile={turn.profile} options={config.options} onSave={save} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <p className="text-xs text-brand-600">{ui(lang, "needsHelp")}</p>
              {turn.profile_summary.length ? (
                <ul className="flex flex-wrap gap-2" aria-label={ui(lang, "yourNeeds")}>
                  {turn.profile_summary.map((s) => (
                    <li key={s} className="chip">
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-brand-600">{ui(lang, "nothingYet")}</p>
              )}
              <button
                type="button"
                className="btn-studio w-full"
                disabled={busy || !turn.can_confirm || turn.status === "confirmed"}
                onClick={() => run(() => assistantApi.confirm(turn.conversation_id, turn.version))}
              >
                {ui(lang, "confirm")}
              </button>
            </>
          )}
          <p className="text-xs text-brand-500">{ui(lang, "privacy", { days: config.retention_days })}</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <button type="button" className="underline" onClick={() => begin(lang)}>
              {ui(lang, "newChat")}
            </button>
            <button type="button" className="text-red-700 underline" onClick={remove}>
              {ui(lang, "deleteChat")}
            </button>
          </div>
        </aside>
      </div>

      {turn.recommendations && (
        <AssistantResults
          lang={lang}
          conversationId={turn.conversation_id}
          recs={turn.recommendations}
          categoryLabel={categoryLabel}
          feedbackReasons={config.options.feedback_reasons}
        />
      )}
      {!turn.recommendations && <p className="text-xs text-brand-600">{turn.disclaimer}</p>}
    </div>
  );
}

function QuickReplies({
  question,
  disabled,
  lang,
  onChoose,
}: {
  question: NonNullable<AssistantTurn["question"]>;
  disabled: boolean;
  lang: AssistantLang;
  onChoose: (values: string[], labels: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const label = (v: string) => question.options.find((o) => o.value === v)?.label ?? v;
  if (!question.multi) {
    return (
      <div className="flex flex-wrap gap-2 border-t border-brand-100 p-3" role="group" aria-label={question.text}>
        {question.options.map((o) => (
          <button key={o.value} type="button" className="chip !cursor-pointer" disabled={disabled} onClick={() => onChoose([o.value], [o.label])}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2 border-t border-brand-100 p-3" role="group" aria-label={question.text}>
      <div className="flex flex-wrap gap-2">
        {question.options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={picked.includes(o.value)}
            className={`chip !cursor-pointer ${picked.includes(o.value) ? "!bg-brand-900 !text-white" : ""}`}
            disabled={disabled}
            onClick={() =>
              setPicked((p) =>
                o.value === "none" ? ["none"] : p.includes(o.value) ? p.filter((x) => x !== o.value) : [...p.filter((x) => x !== "none"), o.value]
              )
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn-secondary" disabled={disabled || picked.length === 0} onClick={() => onChoose(picked, picked.map(label))}>
        {ui(lang, "send")}
      </button>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<Spinner label="Loading the assistant" />}>
        <Assistant />
      </Suspense>
    </RequireAuth>
  );
}
