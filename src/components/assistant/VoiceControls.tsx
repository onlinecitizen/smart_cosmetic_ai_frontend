"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import {
  loadReadAloud,
  saveReadAloud,
  TranscribeResult,
  VoiceConfig,
  voiceApi,
  VoiceRecorder,
  voiceSupported,
  vt,
} from "@/lib/voice";

type Lang = "en" | "sw";
type Phase = "idle" | "explain" | "starting" | "recording" | "processing" | "error";

/**
 * Microphone input. The transcript is handed to the page's text box for the
 * customer to check and edit; it is never sent automatically.
 */
export function VoiceInput({
  lang,
  config,
  disabled,
  onTranscript,
  onTypeInstead,
  onRecordingStart,
}: {
  lang: Lang;
  config: VoiceConfig;
  disabled: boolean;
  onTranscript: (r: TranscribeResult) => void;
  onTypeInstead: () => void;
  /** Called when recording starts, e.g. to stop any reply being read aloud. */
  onRecordingStart: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [retain, setRetain] = useState(false);
  const [explained, setExplained] = useState(false);
  const [deletedNote, setDeletedNote] = useState<string | null>(null);
  const recorder = useRef<VoiceRecorder | null>(null);
  const lastClip = useRef<Blob | null>(null);
  const abort = useRef<AbortController | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const available = config.enabled && config.stt_languages.includes(lang);
  const keeps = config.retain_audio_days > 0 || config.retain_transcript_days > 0;

  const stopTimer = () => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
  };

  const cancel = useCallback(async () => {
    stopTimer();
    abort.current?.abort();
    abort.current = null;
    const r = recorder.current;
    recorder.current = null;
    if (r) await r.cancel();
    setLevel(0);
    setPhase("idle");
  }, []);

  // Never keep recording when the tab is hidden or the page is left.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && recorder.current) void cancel();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void cancel();
    };
  }, [cancel]);

  const send = useCallback(
    async (clip: Blob) => {
      setPhase("processing");
      setError(null);
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setError(vt(lang, "offline"));
        setPhase("error");
        return;
      }
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const r = await voiceApi.transcribe(clip, lang, retain, ctrl.signal);
        if (ctrl.signal.aborted) return;
        if (r.status === "ok") {
          lastClip.current = null;
          setPhase("idle");
          onTranscript(r);
        } else {
          setError(r.message);
          setPhase("error");
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setError(
          err instanceof ApiError && typeof err.detail === "string" && err.status < 500 ? err.detail : vt(lang, "network")
        );
        setPhase("error");
      } finally {
        abort.current = null;
      }
    },
    [lang, retain, onTranscript]
  );

  const finish = useCallback(async () => {
    stopTimer();
    const r = recorder.current;
    recorder.current = null;
    if (!r) return;
    const clip = await r.stop();
    setLevel(0);
    lastClip.current = clip;
    await send(clip);
  }, [send]);

  async function start() {
    setError(null);
    setDeletedNote(null);
    if (!voiceSupported()) {
      setError(vt(lang, "unsupported"));
      setPhase("error");
      return;
    }
    onRecordingStart();
    setPhase("starting");
    const r = new VoiceRecorder(config.max_seconds, setLevel, () => void finish());
    recorder.current = r;
    try {
      await r.start();
    } catch {
      recorder.current = null;
      await r.cancel();
      setError(vt(lang, "denied"));
      setPhase("error");
      return;
    }
    setElapsed(0);
    const began = Date.now();
    tick.current = setInterval(() => setElapsed(Math.floor((Date.now() - began) / 1000)), 250);
    setPhase("recording");
  }

  if (!available) return null;

  return (
    <div className="space-y-2 border-t border-brand-100 p-3 text-sm">
      {config.is_mock && <p className="text-xs text-amber-800">{vt(lang, "mock")}</p>}

      {phase === "idle" && (
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled}
          onClick={() => (explained ? void start() : setPhase("explain"))}
        >
          🎤 {vt(lang, "speak")}
        </button>
      )}

      {phase === "explain" && (
        <div className="space-y-2 rounded-xl bg-brand-50 p-3" role="dialog" aria-label={vt(lang, "explainTitle")}>
          <p className="font-semibold text-brand-900">{vt(lang, "explainTitle")}</p>
          <p>{vt(lang, "explain")}</p>
          <p>{vt(lang, "provider")}</p>
          <p>
            {keeps
              ? vt(lang, "kept", { audio: config.retain_audio_days, text: config.retain_transcript_days })
              : vt(lang, "notKept")}
          </p>
          {keeps && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={retain} onChange={(e) => setRetain(e.target.checked)} />
              {vt(lang, "keepLabel")}
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setExplained(true);
                void start();
              }}
            >
              {vt(lang, "allow")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPhase("idle")}>
              {vt(lang, "notNow")}
            </button>
          </div>
        </div>
      )}

      {(phase === "starting" || phase === "recording") && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3" role="status" aria-live="assertive">
          <span className="relative flex h-3 w-3" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
          </span>
          <span className="font-semibold text-red-800">
            {vt(lang, "recording")} {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
          <span className="text-xs text-red-700">{vt(lang, "seconds", { n: Math.max(0, config.max_seconds - elapsed) })}</span>
          <span className="h-2 w-24 overflow-hidden rounded-full bg-red-100" aria-hidden>
            <span className="block h-full bg-red-500 transition-all" style={{ width: `${Math.min(100, Math.round(level * 140))}%` }} />
          </span>
          <button type="button" className="btn-primary" onClick={() => void finish()} disabled={phase === "starting"}>
            {vt(lang, "stop")}
          </button>
          <button type="button" className="btn-secondary" onClick={() => void cancel()}>
            {vt(lang, "cancel")}
          </button>
        </div>
      )}

      {phase === "processing" && (
        <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3" role="status" aria-live="polite">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-900" aria-hidden />
          <span>{vt(lang, "processing")}</span>
          <button type="button" className="btn-secondary" onClick={() => void cancel()}>
            {vt(lang, "cancel")}
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-2">
          <Alert tone="warning">{error}</Alert>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => (lastClip.current ? void send(lastClip.current) : void start())}
            >
              {vt(lang, "retry")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                lastClip.current = null;
                setPhase("idle");
                onTypeInstead();
              }}
            >
              {vt(lang, "typeInstead")}
            </button>
          </div>
        </div>
      )}

      {keeps && phase === "idle" && (
        <button
          type="button"
          className="text-xs underline"
          onClick={() =>
            voiceApi
              .deleteRecordings()
              .then(() => setDeletedNote(vt(lang, "deletedKept")))
              .catch(() => setDeletedNote(vt(lang, "network")))
          }
        >
          {vt(lang, "deleteKept")}
        </button>
      )}
      {deletedNote && <p className="text-xs text-brand-700" role="status">{deletedNote}</p>}
    </div>
  );
}

/**
 * Spoken replies: off until the customer turns them on (remembered on this
 * device). Reads the latest reply after each turn; can be stopped at any time.
 */
export function useSpokenReplies(lang: Lang, config: VoiceConfig | null, conversationId: string | null, version: number | null) {
  const [on, setOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const available = !!config?.enabled && config.tts_languages.includes(lang);

  useEffect(() => setOn(loadReadAloud()), []);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    if (audio.current) {
      audio.current.pause();
      audio.current.src = "";
    }
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setSpeaking(false);
  }, []);

  const play = useCallback(async () => {
    if (!conversationId || version == null) return;
    stop();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setSpeaking(true);
    try {
      const blob = await voiceApi.speech(conversationId, version, ctrl.signal);
      if (ctrl.signal.aborted) return;
      url.current = URL.createObjectURL(blob);
      const el = audio.current ?? new Audio();
      audio.current = el;
      el.src = url.current;
      el.onended = () => setSpeaking(false);
      await el.play();
      setFailed(false);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setSpeaking(false);
      // 404: nothing to read yet; anything else means the service failed.
      if (!(err instanceof ApiError && err.status === 404)) setFailed(true);
    }
  }, [conversationId, version, stop]);

  useEffect(() => {
    if (on && available && version != null) void play();
  }, [on, available, version, play]);

  useEffect(() => stop, [stop]);

  const toggle = (value: boolean) => {
    setOn(value);
    saveReadAloud(value);
    if (!value) stop();
  };

  return { available, on, toggle, speaking, stop, replay: play, failed };
}

export function SpokenReplyControls({ lang, spoken }: { lang: Lang; spoken: ReturnType<typeof useSpokenReplies> }) {
  if (!spoken.available) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={spoken.on} onChange={(e) => spoken.toggle(e.target.checked)} />
        🔊 {vt(lang, "readAloud")}
      </label>
      {spoken.speaking && (
        <>
          <span className="text-brand-600" role="status">
            {vt(lang, "speaking")}
          </span>
          <button type="button" className="btn-secondary !py-1" onClick={spoken.stop}>
            {vt(lang, "stopSpeaking")}
          </button>
        </>
      )}
      {spoken.on && !spoken.speaking && (
        <button type="button" className="text-xs underline" onClick={() => void spoken.replay()}>
          {vt(lang, "replay")}
        </button>
      )}
      {spoken.failed && <span className="text-xs text-amber-800">{vt(lang, "ttsFailed")}</span>}
    </div>
  );
}
