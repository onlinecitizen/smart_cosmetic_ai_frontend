/**
 * Voice for the Beauty Assistant (backend docs/voice.md).
 *
 * - The microphone is opened only when the customer presses a button and is
 *   closed (all tracks stopped) as soon as recording stops, is cancelled, the
 *   tab is hidden or the page is left. Nothing records in the background.
 * - Audio is recorded as 16 kHz mono PCM WAV and sent to OUR backend only.
 * - The backend returns a draft transcript. It is never sent to the assistant
 *   until the customer has read/edited it and pressed Send.
 * - Spoken replies are audio the backend builds from the conversation; the
 *   browser never decides what is said.
 */
import { API_BASE, ApiError, api } from "./api";

export interface VoiceConfig {
  enabled: boolean;
  provider: string | null;
  is_mock: boolean;
  stt_languages: string[];
  tts_languages: string[];
  max_seconds: number;
  retain_audio_days: number;
  retain_transcript_days: number;
  sample_rate: number;
}

export interface TranscribeResult {
  status: "ok" | "no_speech" | "failed";
  transcript: string;
  confidence: number | null;
  low_confidence: boolean;
  language: string;
  duration_ms: number;
  latency_ms: number;
  kept: boolean;
  message: string;
}

const TARGET_RATE = 16000;

/** Average-and-pick downsampling to 16 kHz (speech band; good enough for recognition). */
export function downsample(input: Float32Array, inputRate: number, targetRate = TARGET_RATE): Float32Array {
  if (inputRate === targetRate) return input;
  if (inputRate < targetRate) throw new Error("Input sample rate is below 16 kHz.");
  const ratio = inputRate / targetRate;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

/** 16-bit PCM mono WAV, the format the backend accepts. */
export function encodeWav(samples: Float32Array, rate = TARGET_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function voiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !== "undefined"
  );
}

/** One recording. Create a new instance for each attempt. */
export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private node: AudioNode | null = null;
  private chunks: Float32Array[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private finished = false;

  constructor(
    private readonly maxSeconds: number,
    private readonly onLevel: (level: number) => void,
    private readonly onAutoStop: () => void
  ) {}

  async start(): Promise<void> {
    // The browser shows its own permission prompt here, the first time.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const source = this.ctx.createMediaStreamSource(this.stream);
    const take = (frame: Float32Array) => {
      if (this.finished) return;
      this.chunks.push(frame);
      let peak = 0;
      for (let i = 0; i < frame.length; i++) peak = Math.max(peak, Math.abs(frame[i]));
      this.onLevel(peak);
    };
    if (this.ctx.audioWorklet) {
      await this.ctx.audioWorklet.addModule("/audio/pcm-recorder.js");
      const worklet = new AudioWorkletNode(this.ctx, "pcm-recorder");
      worklet.port.onmessage = (e: MessageEvent<Float32Array>) => take(e.data);
      source.connect(worklet);
      this.node = worklet;
    } else {
      const proc = this.ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = (e) => take(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(proc);
      proc.connect(this.ctx.destination);
      this.node = proc;
    }
    this.timer = setTimeout(() => this.onAutoStop(), this.maxSeconds * 1000);
  }

  /** Stops the microphone and returns the WAV. */
  async stop(): Promise<Blob> {
    const rate = this.ctx?.sampleRate ?? TARGET_RATE;
    await this.release();
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const all = new Float32Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      all.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];
    return encodeWav(downsample(all, rate));
  }

  /** Stops the microphone and throws the audio away. */
  async cancel(): Promise<void> {
    this.chunks = [];
    await this.release();
  }

  private async release(): Promise<void> {
    this.finished = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.node?.disconnect();
    this.node = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx && this.ctx.state !== "closed") await this.ctx.close().catch(() => undefined);
    this.ctx = null;
  }
}

function csrf(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(^| )cosmetic_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[2]) : null;
}

export const voiceApi = {
  config: () => api.get<VoiceConfig>("/api/v1/assistant/voice/config"),
  transcribe: (audio: Blob, language: string, retain: boolean, signal?: AbortSignal) => {
    const form = new FormData();
    form.append("audio", audio, "clip.wav");
    form.append("language", language);
    form.append("retain", retain ? "true" : "false");
    return api.postForm<TranscribeResult>("/api/v1/assistant/voice/transcribe", form, signal);
  },
  /** Audio for the conversation's latest reply, built by the server. */
  speech: async (conversationId: string, version: number, signal?: AbortSignal): Promise<Blob> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = csrf();
    if (token) headers["X-CSRF-Token"] = token;
    const res = await fetch(`${API_BASE}/api/v1/assistant/conversations/${encodeURIComponent(conversationId)}/speech`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ version }),
      signal,
    });
    if (!res.ok) {
      let detail: unknown = res.statusText;
      try {
        detail = (await res.json()).detail;
      } catch {
        /* not JSON */
      }
      throw new ApiError(res.status, detail);
    }
    return res.blob();
  },
  deleteRecordings: () => api.del("/api/v1/assistant/voice/recordings"),
};

/** Interface text for voice controls. Kiswahili is a draft (native-speaker review pending). */
const TEXT = {
  en: {
    speak: "Speak",
    explainTitle: "Use your voice",
    explain:
      "The microphone is used only while the red recording light is on. You'll see what was heard and can correct it before anything is sent.",
    provider: "Your recording is sent to our speech service (Microsoft Azure) to turn it into text.",
    notKept: "We don't keep your recording or the transcript.",
    kept: "Only if you tick the box below do we keep the recording for {audio} days and the transcript for {text} days, to improve recognition. You can delete them at any time.",
    keepLabel: "Keep this recording to help improve recognition",
    allow: "Allow microphone and start",
    notNow: "Not now",
    recording: "Recording",
    stop: "Stop",
    cancel: "Cancel",
    processing: "Turning your speech into text…",
    retry: "Try again",
    typeInstead: "Type instead",
    denied: "Microphone access was blocked. Allow it in your browser settings, or type your message.",
    unsupported: "Voice input isn't available in this browser. Please type your message.",
    offline: "You seem to be offline. Your recording is kept on this page; try again when you're connected, or type.",
    network: "We couldn't reach the server. Try again, or type your message.",
    readAloud: "Read replies aloud",
    stopSpeaking: "Stop speaking",
    speaking: "Speaking…",
    replay: "Replay",
    ttsFailed: "Spoken replies aren't working right now. Replies are shown as text.",
    mock: "Test mode: speech is simulated (not a real speech service).",
    deleteKept: "Delete my kept recordings",
    deletedKept: "Your kept recordings were deleted.",
    seconds: "{n} s left",
  },
  sw: {
    speak: "Ongea",
    explainTitle: "Tumia sauti yako",
    explain:
      "Kipaza sauti kinatumika tu wakati taa nyekundu ya kurekodi inawaka. Utaona kilichosikika na unaweza kukirekebisha kabla ya kutuma chochote.",
    provider: "Rekodi yako inatumwa kwa huduma yetu ya sauti (Microsoft Azure) ili kuigeuza kuwa maandishi.",
    notKept: "Hatuhifadhi rekodi yako wala maandishi.",
    kept: "Ukiweka alama hapa chini tu, tutahifadhi rekodi kwa siku {audio} na maandishi kwa siku {text}, ili kuboresha utambuzi. Unaweza kuyafuta wakati wowote.",
    keepLabel: "Hifadhi rekodi hii kusaidia kuboresha utambuzi",
    allow: "Ruhusu kipaza sauti na anza",
    notNow: "Si sasa",
    recording: "Inarekodi",
    stop: "Simamisha",
    cancel: "Ghairi",
    processing: "Inageuza sauti yako kuwa maandishi…",
    retry: "Jaribu tena",
    typeInstead: "Andika badala yake",
    denied: "Ruhusa ya kipaza sauti imezuiwa. Iruhusu kwenye mipangilio ya kivinjari, au andika ujumbe wako.",
    unsupported: "Kuingiza kwa sauti hakupatikani kwenye kivinjari hiki. Tafadhali andika ujumbe wako.",
    offline: "Inaonekana huna mtandao. Rekodi yako imehifadhiwa kwenye ukurasa huu; jaribu tena ukiunganishwa, au andika.",
    network: "Hatukuweza kufikia seva. Jaribu tena, au andika ujumbe wako.",
    readAloud: "Soma majibu kwa sauti",
    stopSpeaking: "Acha kusoma",
    speaking: "Inasoma…",
    replay: "Rudia",
    ttsFailed: "Majibu ya sauti hayafanyi kazi sasa. Majibu yanaonyeshwa kwa maandishi.",
    mock: "Hali ya majaribio: sauti inaigwa (si huduma halisi ya sauti).",
    deleteKept: "Futa rekodi zangu zilizohifadhiwa",
    deletedKept: "Rekodi zako zilizohifadhiwa zimefutwa.",
    seconds: "Sekunde {n} zimebaki",
  },
} as const;

export type VoiceTextKey = keyof (typeof TEXT)["en"];

export function vt(lang: "en" | "sw", key: VoiceTextKey, vars?: Record<string, string | number>): string {
  let s: string = TEXT[lang]?.[key] ?? TEXT.en[key];
  for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Remembered per viewer only (not an account setting). Storage may be unavailable. */
export function loadReadAloud(): boolean {
  try {
    return window.localStorage.getItem("sca.readAloud") === "1";
  } catch {
    return false;
  }
}

export function saveReadAloud(on: boolean): void {
  try {
    window.localStorage.setItem("sca.readAloud", on ? "1" : "0");
  } catch {
    /* ignore */
  }
}
