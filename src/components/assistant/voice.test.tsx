import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpokenReplyControls, useSpokenReplies, VoiceInput } from "./VoiceControls";
import { downsample, encodeWav, VoiceConfig } from "@/lib/voice";

const config: VoiceConfig = {
  enabled: true,
  provider: "azure",
  is_mock: false,
  stt_languages: ["en", "sw"],
  tts_languages: ["en", "sw"],
  max_seconds: 30,
  retain_audio_days: 0,
  retain_transcript_days: 0,
  sample_rate: 16000,
};

let trackStops: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;
let processor: { onaudioprocess: ((e: unknown) => void) | null; connect: () => void; disconnect: () => void };

class FakeAudioContext {
  sampleRate = 48000;
  state = "running";
  destination = {};
  audioWorklet = undefined;
  createMediaStreamSource() {
    return { connect: () => undefined };
  }
  createScriptProcessor() {
    return processor;
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  trackStops = vi.fn();
  processor = { onaudioprocess: null, connect: () => undefined, disconnect: () => undefined };
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStops }] });
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function speakSomething() {
  const frame = new Float32Array(4800).map((_, i) => Math.sin(i / 10) * 0.4);
  act(() => processor.onaudioprocess?.({ inputBuffer: { getChannelData: () => frame } }));
}

function renderInput(overrides: Partial<React.ComponentProps<typeof VoiceInput>> = {}) {
  const props: {
    lang: "en" | "sw";
    config: VoiceConfig;
    disabled: boolean;
    onTranscript: ReturnType<typeof vi.fn>;
    onTypeInstead: ReturnType<typeof vi.fn>;
    onRecordingStart: ReturnType<typeof vi.fn>;
  } = {
    lang: "en" as const,
    config,
    disabled: false,
    onTranscript: vi.fn(),
    onTypeInstead: vi.fn(),
    onRecordingStart: vi.fn(),
    ...(overrides as object),
  };
  render(<VoiceInput {...props} />);
  return props;
}

describe("audio encoding", () => {
  it("downsamples to 16 kHz and writes a 16-bit mono WAV header", async () => {
    const out = downsample(new Float32Array(48000).fill(0.5), 48000);
    expect(out.length).toBe(16000);
    const wav = encodeWav(out);
    const buf = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(wav);
    });
    const view = new DataView(buf);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe("RIFF");
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(wav.size).toBe(44 + 16000 * 2);
  });
});

describe("VoiceInput", () => {
  it("asks for the microphone only after an explicit choice and shows a recording state", async () => {
    const props = renderInput();
    fireEvent.click(screen.getByRole("button", { name: /Speak/ }));
    expect(getUserMedia).not.toHaveBeenCalled(); // explanation first
    expect(screen.getByText(/Microsoft Azure/)).toBeInTheDocument();
    expect(screen.getByText(/don't keep your recording/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Allow microphone and start" }));
    await screen.findByText(/^Recording/);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(props.onRecordingStart).toHaveBeenCalled(); // interrupts any reply being read
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trackStops).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /Speak/ })).toBeInTheDocument();
  });

  it("puts the transcript in the text box for checking instead of sending it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ status: "ok", transcript: "dry skin", confidence: 0.9, low_confidence: false, language: "en", duration_ms: 300, latency_ms: 400, kept: false, message: "Check the transcript" })
    );
    vi.stubGlobal("fetch", fetchMock);
    const props = renderInput();
    fireEvent.click(screen.getByRole("button", { name: /Speak/ }));
    fireEvent.click(screen.getByRole("button", { name: "Allow microphone and start" }));
    await screen.findByText(/^Recording/);
    speakSomething();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(props.onTranscript).toHaveBeenCalled());
    expect(trackStops).toHaveBeenCalled();
    expect(props.onTranscript.mock.calls[0][0].transcript).toBe("dry skin");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/assistant/voice/transcribe");
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/messages"))).toBe(false);
  });

  it("stops recording when the tab is hidden", async () => {
    renderInput();
    fireEvent.click(screen.getByRole("button", { name: /Speak/ }));
    fireEvent.click(screen.getByRole("button", { name: "Allow microphone and start" }));
    await screen.findByText(/^Recording/);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(() => expect(trackStops).toHaveBeenCalled());
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("falls back to typing when access is denied or recognition fails, and can retry", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    const props = renderInput();
    fireEvent.click(screen.getByRole("button", { name: /Speak/ }));
    fireEvent.click(screen.getByRole("button", { name: "Allow microphone and start" }));
    expect(await screen.findByText(/Microphone access was blocked/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Type instead" }));
    expect(props.onTypeInstead).toHaveBeenCalled();

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        json({ status: "ok", transcript: "oily skin", confidence: 0.8, low_confidence: false, language: "en", duration_ms: 300, latency_ms: 400, kept: false, message: "ok" })
      );
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: /Speak/ }));
    await screen.findByText(/^Recording/);
    speakSomething();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(await screen.findByText(/couldn't reach the server/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" })); // resends the same clip
    await waitFor(() => expect(props.onTranscript).toHaveBeenCalled());
    expect(getUserMedia).toHaveBeenCalledTimes(2); // retry did not record again
  });

  it("explains when the device is offline and keeps the clip", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderInput({ lang: "sw" });
    fireEvent.click(screen.getByRole("button", { name: /Ongea/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ruhusu kipaza sauti na anza" }));
    await screen.findByText(/^Inarekodi/);
    speakSomething();
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Simamisha" }));
    expect(await screen.findByText(/huna mtandao/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    online.mockRestore();
  });

  it("is hidden when voice isn't offered for the language", () => {
    renderInput({ config: { ...config, stt_languages: ["en"] }, lang: "sw" });
    expect(screen.queryByRole("button", { name: /Ongea/ })).toBeNull();
  });

  it("offers consent and deletion only when retention is configured", async () => {
    renderInput({ config: { ...config, retain_audio_days: 7, retain_transcript_days: 30 } });
    expect(screen.getByRole("button", { name: "Delete my kept recordings" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Speak/ }));
    expect(screen.getByText(/7 days/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Keep this recording/)).not.toBeChecked();
  });
});

function Spoken({ version }: { version: number }) {
  const spoken = useSpokenReplies("en", config, "c1", version);
  return <SpokenReplyControls lang="en" spoken={spoken} />;
}

describe("spoken replies", () => {
  it("are off by default, read the latest reply when on, and can be stopped", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    vi.stubGlobal(
      "Audio",
      vi.fn().mockImplementation(() => ({ play, pause, src: "", onended: null }))
    );
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["mp3"]), { status: 200, headers: { "content-type": "audio/mpeg" } }));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<Spoken version={3} />);
    expect(screen.getByLabelText(/Read replies aloud/)).not.toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/Read replies aloud/));
    await waitFor(() => expect(play).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/assistant/conversations/c1/speech");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ version: 3 }); // no text from the browser
    fireEvent.click(screen.getByRole("button", { name: "Stop speaking" }));
    expect(pause).toHaveBeenCalled();
    view.rerender(<Spoken version={4} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("shows text-only notice when speech fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ detail: "down" }, 503)));
    window.localStorage.setItem("sca.readAloud", "1");
    render(<Spoken version={1} />);
    expect(await screen.findByText(/Replies are shown as text/)).toBeInTheDocument();
    window.localStorage.removeItem("sca.readAloud");
  });
});
