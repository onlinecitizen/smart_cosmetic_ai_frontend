"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Reveal } from "@/components/Reveal";
import { Bottle } from "@/components/Bottle";
import { StepIndicator } from "@/components/assessment/StepIndicator";
import { ScoreRing } from "@/components/assessment/ScoreRing";
import { AnalysisSequence, ANALYSIS_MESSAGES, ANALYSIS_STEP_MS } from "@/components/assessment/AnalysisSequence";
import { api, ApiError, ClimateSnapshot, DiagnosticResult, DiagnosticSession, Formula } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { firstName } from "@/lib/product";

type Step = "consent" | "capture" | "preview" | "analyzing" | "results";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session has expired. Please log in again.";
    if (err.status === 403) return "We couldn't verify your session. Please refresh the page and try again.";
    if (err.status === 413) return "That photo is too large. Please use a smaller image.";
  }
  return "Something went wrong during analysis. Please try again.";
}

function AnalyzeContent() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("consent");
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Refs don't trigger re-renders, so track "camera is live" in state too;
  // otherwise the Capture button never appears after the stream starts.
  const [cameraOn, setCameraOn] = useState(false);

  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [region, setRegion] = useState("");
  const [climate, setClimate] = useState<ClimateSnapshot | null>(null);
  const [formula, setFormula] = useState<Formula | null>(null);
  const [busy, setBusy] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  async function acceptConsent() {
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/v1/diagnostics/consent", { granted: true, consent_type: "facial_image_processing" });
      setStep("capture");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? describeError(err) : "Could not record consent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("Camera access was denied or is unavailable. You can upload a photo instead.");
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        stopCamera();
        setStep("preview");
      },
      "image/jpeg",
      0.9
    );
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    stopCamera();
    setCapturedBlob(file);
    setCapturedUrl(URL.createObjectURL(file));
    setStep("preview");
  }

  function retake() {
    setCapturedBlob(null);
    setCapturedUrl(null);
    setStep("capture");
  }

  function startOver() {
    setSession(null);
    setResult(null);
    setClimate(null);
    setFormula(null);
    setError(null);
    retake();
  }

  async function analyze(e?: React.FormEvent) {
    e?.preventDefault();
    if (!capturedBlob || !region.trim()) return;
    setBusy(true);
    setError(null);
    setStep("analyzing");

    const minimumShowtime = sleep(ANALYSIS_MESSAGES.length * ANALYSIS_STEP_MS + 300);

    const work = (async () => {
      // Reuse an already-analyzed session (e.g. when only the climate or
      // formula step failed) - the backend rejects re-analyzing a session.
      let currentSession = session;
      let analyzed = result;
      if (!currentSession || !analyzed) {
        currentSession = await api.post<DiagnosticSession>("/api/v1/diagnostics/sessions");
        setSession(currentSession);
        const form = new FormData();
        form.append("image", capturedBlob, "capture.jpg");
        analyzed = await api.postForm<DiagnosticResult>(
          `/api/v1/diagnostics/sessions/${currentSession.id}/analyze`,
          form
        );
        setResult(analyzed);
      }
      const reading = await api.post<ClimateSnapshot>("/api/v1/climate", { region: region.trim() });
      setClimate(reading);
      const generated = await api.post<Formula>("/api/v1/formulas", {
        diagnostic_session_id: currentSession.id,
        climate_snapshot_id: reading.id,
      });
      setFormula(generated);
    })();

    try {
      await Promise.all([work, minimumShowtime]);
      setStep("results");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const detail = err.detail as { message?: string; reasons?: string[] };
        const reasons = (detail?.reasons || []).map((r) => r.replace(/_/g, " "));
        setError(
          `${detail?.message || "Image quality insufficient."}${reasons.length ? ` (${reasons.join(", ")})` : ""} ` +
            "Try facing a window or lamp and holding still."
        );
        setSession(null);
        setResult(null);
        retake();
      } else {
        setError(describeError(err));
        setStep("preview");
      }
    } finally {
      setBusy(false);
    }
  }

  const indicator: 1 | 2 | 3 | 4 =
    step === "analyzing" ? 2 : step === "results" ? (formula?.status === "VALIDATED" ? 4 : 3) : 1;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <StepIndicator current={indicator} />

      {error && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {step === "consent" && (
        <section className="mt-12 grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow">Step 01 · Capture</p>
            <h1 className="display mt-4 text-5xl sm:text-6xl">Let’s begin with your skin.</h1>
            <p className="mt-6 leading-relaxed text-brand-600">
              We’ll take one photo with your camera to estimate hydration, redness, pore density and barrier
              strength. It takes about two minutes.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="glass space-y-6 p-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-900">Your privacy</h2>
              <ul className="space-y-4 text-sm leading-relaxed text-brand-600">
                <li className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                  Your photo is processed to produce your skin profile, then deleted.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                  It is never stored permanently, made public, or sent to the laboratory.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                  Results are cosmetic estimates, not a medical diagnosis.
                </li>
              </ul>
              <button className="btn-primary w-full" onClick={acceptConsent} disabled={busy}>
                {busy ? "One moment..." : "I agree, begin"}
              </button>
            </div>
          </Reveal>
        </section>
      )}

      {step === "capture" && (
        <section className="mt-12 grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-[2rem] bg-brand-900 shadow-lift">
            <video
              ref={videoRef}
              className={`h-full w-full -scale-x-100 object-cover transition-opacity duration-700 ${cameraOn ? "opacity-100" : "opacity-0"}`}
              playsInline
              muted
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[72%] w-[66%]">
                <div className="absolute inset-0 rounded-[50%] border border-gold-300/80" />
                {cameraOn && <div className="pulse-ring absolute inset-0 rounded-[50%] border border-gold-300/60" />}
              </div>
            </div>
            {[
              "left-5 top-5 border-l border-t",
              "right-5 top-5 border-r border-t",
              "left-5 bottom-5 border-l border-b",
              "right-5 bottom-5 border-r border-b",
            ].map((c) => (
              <span key={c} className={`pointer-events-none absolute h-6 w-6 border-gold-300/80 ${c}`} aria-hidden />
            ))}
            {!cameraOn && (
              <div className="absolute inset-0 grid place-items-center">
                <button className="btn-gold" onClick={startCamera}>
                  Enable camera
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow">Step 01 · Capture</p>
            <h1 className="display mt-4 text-4xl sm:text-5xl">Frame your face.</h1>
            <ul className="mt-6 space-y-3 text-sm text-brand-600">
              <li>Center your face inside the outline.</li>
              <li>Face a window or soft light — avoid strong backlight.</li>
              <li>Remove glasses and hold still.</li>
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              {cameraOn && (
                <button className="btn-primary" onClick={captureFrame}>
                  Capture photo
                </button>
              )}
              <label className="btn-secondary cursor-pointer">
                Upload a photo instead
                <input type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
              </label>
            </div>
          </div>
        </section>
      )}

      {step === "preview" && capturedUrl && (
        <section className="mt-12 grid items-center gap-10 md:grid-cols-2">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[2rem] shadow-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedUrl} alt="Your captured photo" className="h-full w-full object-cover" />
          </div>
          <form onSubmit={analyze}>
            <p className="eyebrow">Step 01 · Capture</p>
            <h1 className="display mt-4 text-4xl sm:text-5xl">One last detail.</h1>
            <p className="mt-4 text-brand-600">Where do you live? Your climate shapes your formula.</p>
            <label className="label mt-8" htmlFor="region">
              City and country
            </label>
            <input
              id="region"
              className="input"
              placeholder="e.g. Dar es Salaam, Tanzania"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              maxLength={120}
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="btn-primary flex-1" disabled={busy || !region.trim()}>
                Analyze my skin
              </button>
              <button type="button" className="btn-secondary" onClick={retake} disabled={busy}>
                Retake
              </button>
            </div>
          </form>
        </section>
      )}

      {step === "analyzing" && (
        <section className="mt-12">
          <AnalysisSequence photoUrl={capturedUrl} />
        </section>
      )}

      {step === "results" && result && (
        <div className="mt-14 space-y-20">
          <section>
            <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="eyebrow">Step 03 · Personalize</p>
                <h1 className="display mt-4 text-5xl sm:text-6xl">Your skin profile</h1>
              </div>
              <div className="text-sm text-brand-500 md:text-right">
                <p>Confidence {Math.round(result.confidence * 100)}%</p>
                <p className="text-xs text-brand-400">
                  AI estimate from one photo · model {result.model_version}
                  {result.provider === "mock" && " (demonstration)"}
                </p>
              </div>
            </Reveal>
            {result.confidence < 0.5 && (
              <p className="mt-6 text-sm text-brand-600">
                This estimate may be less reliable — consider retaking in better lighting.
              </p>
            )}
            <div className="mt-12 grid grid-cols-2 gap-y-12 md:grid-cols-4">
              <ScoreRing label="Hydration" value={result.hydration} helpText="Higher means more hydrated." />
              <ScoreRing label="Redness" value={result.redness} helpText="Lower means less visible redness." delay={150} />
              <ScoreRing
                label="Pore density"
                value={result.pore_density}
                helpText="Lower means less visible pores."
                delay={300}
              />
              <ScoreRing
                label="Barrier index"
                value={result.barrier_index}
                helpText="Higher means a stronger barrier."
                delay={450}
              />
            </div>
          </section>

          {climate && (
            <section>
              <Reveal>
                <p className="eyebrow">Your environment</p>
              </Reveal>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-brand-200/70 bg-brand-200/70 md:grid-cols-4">
                {[
                  { k: "Temperature", v: `${climate.temperature_c}°C` },
                  { k: "Humidity", v: `${Math.round(climate.humidity * 100)}%` },
                  { k: "UV index", v: climate.uv_index != null ? `${climate.uv_index}` : "—" },
                  { k: "Region", v: climate.region },
                ].map((d, i) => (
                  <Reveal key={d.k} delay={i * 100} className="h-full">
                    <div className="h-full bg-brand-50 p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-400">{d.k}</p>
                      <p className="display mt-3 break-words text-2xl sm:text-3xl">{d.v}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
              <p className="mt-4 text-sm text-brand-500">
                Your environment is considered when building your personalized formula.
                {climate.provider.startsWith("mock") && <span className="text-brand-400"> Demo climate service.</span>}
              </p>
            </section>
          )}

          {formula && formula.status === "VALIDATED" && (
            <Reveal>
              <section className="relative overflow-hidden rounded-[2rem] bg-brand-900 px-6 py-12 text-center sm:px-12">
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(200,169,110,0.3)_0%,transparent_65%)]"
                  aria-hidden
                />
                <div className="relative mx-auto h-72 w-40">
                  <Bottle name={firstName(user?.full_name)} code={formula.formula_code} className="h-full w-full" />
                </div>
                <p className="relative mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">
                  Step 04 · Formula
                </p>
                <h2 className="display relative mt-4 text-4xl !text-brand-50 sm:text-5xl">
                  Your personalized formula is ready
                </h2>
                <Link href={`/formula/${formula.id}`} className="btn-gold relative mt-10">
                  Meet my formula
                </Link>
              </section>
            </Reveal>
          )}

          {formula && formula.status !== "VALIDATED" && (
            <section className="card space-y-4">
              <h2 className="display text-3xl">We couldn’t build a formula from this profile</h2>
              <p className="text-sm text-brand-600">
                For your safety, a formula is only offered when it passes every formulation check.
              </p>
              {formula.validation_errors.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-brand-500">
                  {formula.validation_errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              <button className="btn-primary" onClick={startOver}>
                Start a new assessment
              </button>
            </section>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <RequireAuth>
      <AnalyzeContent />
    </RequireAuth>
  );
}
