"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Reveal } from "@/components/Reveal";
import { Bottle } from "@/components/Bottle";
import { StepIndicator } from "@/components/assessment/StepIndicator";
import { ScoreRing } from "@/components/assessment/ScoreRing";
import {
  AnalysisProgress,
  AnalysisStepKey,
  ANALYSIS_STEPS,
  StepState,
} from "@/components/assessment/AnalysisProgress";
import { Alert, DemoBadge } from "@/components/ui/States";
import { api, ApiError, ClimateSnapshot, DiagnosticResult, DiagnosticSession, errorMessage, Formula } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isDemoProvider, LOW_CONFIDENCE, METRICS } from "@/lib/diagnostic";
import { firstName } from "@/lib/product";
import { SITE_STATUS } from "@/lib/siteStatus";

type Step = "consent" | "capture" | "preview" | "analyzing" | "results";

const IDLE_PROGRESS: Record<AnalysisStepKey, StepState> = Object.fromEntries(
  ANALYSIS_STEPS.map((s) => [s.key, "pending"])
) as Record<AnalysisStepKey, StepState>;

function describeError(err: unknown): string {
  if (err instanceof ApiError && err.status === 413) return "That photo is too large. Please use a smaller image.";
  return errorMessage(err, "Something went wrong during analysis. Please try again.");
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
  const [progress, setProgress] = useState(IDLE_PROGRESS);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // Free the in-memory preview of the photo when it is replaced or the page closes.
  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

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
      setError(errorMessage(err, "We couldn’t record your consent. Please try again."));
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
    setError(null);
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

    // Reuse an already-analyzed session (e.g. when only the climate or
    // formula step failed) - the backend rejects re-analyzing a session.
    const alreadyAnalyzed = Boolean(session && result);
    setProgress({ photo: alreadyAnalyzed ? "done" : "active", climate: "pending", formula: "pending" });
    let current: AnalysisStepKey = "photo";

    try {
      let currentSession = session;
      if (!currentSession || !result) {
        currentSession = await api.post<DiagnosticSession>("/api/v1/diagnostics/sessions");
        setSession(currentSession);
        const form = new FormData();
        form.append("image", capturedBlob, "capture.jpg");
        const analyzed = await api.postForm<DiagnosticResult>(
          `/api/v1/diagnostics/sessions/${currentSession.id}/analyze`,
          form
        );
        setResult(analyzed);
      }

      current = "climate";
      setProgress({ photo: "done", climate: "active", formula: "pending" });
      const reading = await api.post<ClimateSnapshot>("/api/v1/climate", { region: region.trim() });
      setClimate(reading);

      current = "formula";
      setProgress({ photo: "done", climate: "done", formula: "active" });
      const generated = await api.post<Formula>("/api/v1/formulas", {
        diagnostic_session_id: currentSession.id,
        climate_snapshot_id: reading.id,
      });
      setFormula(generated);
      setProgress({ photo: "done", climate: "done", formula: "done" });
      setStep("results");
    } catch (err) {
      setProgress((p) => ({ ...p, [current]: "error" }));
      if (err instanceof ApiError && err.status === 422 && current === "photo") {
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
  const demoScores = result ? isDemoProvider(result.provider) : SITE_STATUS.skinScoresAreDemo;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <StepIndicator current={indicator} />

      {error && (
        <Alert tone="error" className="mt-8">
          {error}
        </Alert>
      )}

      {step === "consent" && (
        <section className="mt-10 grid items-center gap-10 md:mt-12 md:grid-cols-2 md:gap-12">
          <div>
            <p className="eyebrow">Step 01 · Capture</p>
            <h1 className="display mt-4 text-4xl sm:text-6xl">Let’s begin with your skin.</h1>
            <p className="mt-6 leading-relaxed text-brand-600">
              We’ll use one photo to produce four skin scores: hydration, redness, pore density and barrier index.
            </p>
            {demoScores && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-brand-600">
                <DemoBadge />
                <span>Scores currently come from a demonstration model, not a validated skin analysis.</span>
              </p>
            )}
          </div>
          <div className="glass space-y-6 p-6 sm:p-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-900">Before you start</h2>
            <ul className="space-y-4 text-sm leading-relaxed text-brand-600">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-700" aria-hidden />
                Your photo is sent to our server, analyzed, and then discarded. It is never saved or made public.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-700" aria-hidden />
                If you place an order, the laboratory receives your formula, your skin scores and your region, never
                your photo or your name.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-700" aria-hidden />
                Results are cosmetic estimates, not a medical diagnosis.
              </li>
            </ul>
            <button className="btn-primary w-full" onClick={acceptConsent} disabled={busy}>
              {busy ? "One moment..." : "I agree, begin"}
            </button>
          </div>
        </section>
      )}

      {step === "capture" && (
        <section className="mt-10 grid items-center gap-8 md:mt-12 md:grid-cols-[1.2fr_1fr] md:gap-10">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[2rem] bg-brand-900 shadow-lift md:max-w-md">
            <video
              ref={videoRef}
              className={`h-full w-full -scale-x-100 object-cover transition-opacity duration-700 ${cameraOn ? "opacity-100" : "opacity-0"}`}
              playsInline
              muted
              aria-label="Camera preview"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="relative h-[72%] w-[66%]">
                <div className="absolute inset-0 rounded-[50%] border border-gold-300/80" />
              </div>
            </div>
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
            <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-brand-600">
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
              {/* sr-only (not display:none) keeps the file input reachable by keyboard. */}
              <label className="btn-secondary cursor-pointer focus-within:ring-2 focus-within:ring-gold-700 focus-within:ring-offset-2">
                Upload a photo instead
                <input type="file" accept="image/*" className="sr-only" onChange={onFileSelected} />
              </label>
            </div>
          </div>
        </section>
      )}

      {step === "preview" && capturedUrl && (
        <section className="mt-10 grid items-center gap-8 md:mt-12 md:grid-cols-2 md:gap-10">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[16rem] overflow-hidden rounded-[2rem] shadow-lift sm:max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedUrl} alt="Your captured photo" className="h-full w-full object-cover" />
          </div>
          <form onSubmit={analyze}>
            <p className="eyebrow">Step 01 · Capture</p>
            <h1 className="display mt-4 text-4xl sm:text-5xl">One last detail.</h1>
            <p className="mt-4 text-brand-600">
              Where do you live? Your local weather is recorded alongside your formula.
            </p>
            <label className="label mt-8" htmlFor="region">
              City and country
            </label>
            <input
              id="region"
              className="input"
              placeholder="e.g. Dar es Salaam, Tanzania"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              autoComplete="address-level2"
              aria-describedby="region-hint"
              required
              maxLength={120}
            />
            <p id="region-hint" className="mt-1.5 text-xs text-brand-500">
              Used only to look up your current weather.
            </p>
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
        <section className="mt-10 md:mt-12">
          <AnalysisProgress states={progress} photoUrl={capturedUrl} />
        </section>
      )}

      {step === "results" && result && (
        <div className="mt-12 space-y-16 md:mt-14 md:space-y-20">
          <section aria-labelledby="profile-heading">
            <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="eyebrow">Step 03 · Personalize</p>
                <h1 id="profile-heading" className="display mt-4 text-4xl sm:text-6xl">
                  Your skin profile
                </h1>
              </div>
              <div className="space-y-2 text-sm text-brand-600 md:text-right">
                {isDemoProvider(result.provider) && <DemoBadge>Demonstration scores</DemoBadge>}
                <p>
                  Confidence {Math.round(result.confidence * 100)}%
                  <span className="text-brand-500"> · model {result.model_version}</span>
                </p>
              </div>
            </Reveal>
            {isDemoProvider(result.provider) && (
              <Alert tone="warning" className="mt-6">
                These scores come from a demonstration model, not a validated skin analysis. Treat them as
                illustrative.
              </Alert>
            )}
            {result.confidence < LOW_CONFIDENCE && (
              <Alert tone="warning" className="mt-4">
                This estimate may be unreliable.{" "}
                <button type="button" className="font-semibold underline underline-offset-4" onClick={startOver}>
                  Retake in better lighting
                </button>
              </Alert>
            )}
            <div className="mt-10 grid grid-cols-2 gap-y-10 md:mt-12 md:grid-cols-4 md:gap-y-12">
              {METRICS.map((m, i) => (
                <ScoreRing key={m.key} label={m.label} value={result[m.key]} helpText={m.scale} delay={i * 150} />
              ))}
            </div>
          </section>

          {climate && (
            <section aria-labelledby="climate-heading">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="climate-heading" className="eyebrow">
                  Your local weather
                </h2>
                {isDemoProvider(climate.provider) && <DemoBadge>Demo weather data</DemoBadge>}
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-brand-200/70 bg-brand-200/70 md:grid-cols-4">
                {[
                  { k: "Temperature", v: `${climate.temperature_c}°C` },
                  { k: "Humidity", v: `${Math.round(climate.humidity * 100)}%` },
                  { k: "UV index", v: climate.uv_index != null ? `${climate.uv_index}` : "—" },
                  { k: "Region", v: climate.region },
                ].map((d) => (
                  <div key={d.k} className="h-full bg-brand-50 p-5 sm:p-6">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-500">{d.k}</dt>
                    <dd className="display mt-3 break-words text-2xl sm:text-3xl">{d.v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-brand-600">
                {SITE_STATUS.climateChangesFormula
                  ? "Your local climate was used when building your formula."
                  : "Recorded with your formula for reference. It does not change the ingredients yet."}
              </p>
            </section>
          )}

          {formula && formula.status === "VALIDATED" && (
            <section className="relative overflow-hidden rounded-[2rem] bg-brand-900 px-6 py-12 text-center sm:px-12">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(200,169,110,0.3)_0%,transparent_65%)]"
                aria-hidden
              />
              <div className="relative mx-auto h-60 w-32 sm:h-72 sm:w-40">
                <Bottle name={firstName(user?.full_name)} code={formula.formula_code} className="h-full w-full" />
              </div>
              <p className="relative mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300">
                Step 04 · Formula
              </p>
              <h2 className="display relative mt-4 text-3xl !text-brand-50 sm:text-5xl">
                Your formula {formula.formula_code} is ready to review
              </h2>
              <p className="relative mx-auto mt-4 max-w-md text-sm text-brand-300">
                See every ingredient, its amount and why it was added before deciding whether to order.
              </p>
              <Link href={`/formula/${formula.id}`} className="btn-gold relative mt-8">
                Review my formula
              </Link>
            </section>
          )}

          {formula && formula.status !== "VALIDATED" && (
            <section className="card space-y-4">
              <h2 className="display text-3xl">We couldn’t build an orderable formula from this profile</h2>
              <p className="text-sm text-brand-600">
                A formula is only offered when it passes every formulation check. These checks failed:
              </p>
              {formula.validation_errors.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-brand-600">
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
