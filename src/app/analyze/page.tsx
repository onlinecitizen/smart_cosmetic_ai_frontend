"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { ScoreBar } from "@/components/ScoreBar";
import { api, ApiError, ClimateSnapshot, DiagnosticResult, DiagnosticSession, Formula } from "@/lib/api";

type Step = "intro" | "consent" | "camera" | "captured" | "analyzing" | "results" | "climate" | "formula";

function AnalyzeContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const [region, setRegion] = useState("Zanzibar Urban/West, Tanzania");
  const [climate, setClimate] = useState<ClimateSnapshot | null>(null);
  const [formula, setFormula] = useState<Formula | null>(null);
  const [busy, setBusy] = useState(false);
  // Refs don't trigger re-renders, so track "camera is live" in state too;
  // otherwise the Capture button never appears after the stream starts.
  const [cameraOn, setCameraOn] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function acceptConsent() {
    setError(null);
    try {
      await api.post("/api/v1/diagnostics/consent", { granted: true, consent_type: "facial_image_processing" });
      setStep("camera");
    } catch {
      setError("Could not record consent. Please try again.");
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
      setError(
        "Camera access was denied or is unavailable. You can also upload a photo below instead."
      );
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
        setStep("captured");
      },
      "image/jpeg",
      0.9
    );
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedBlob(file);
    setCapturedUrl(URL.createObjectURL(file));
    setStep("captured");
  }

  async function submitCapture() {
    if (!capturedBlob) return;
    setBusy(true);
    setError(null);
    setStep("analyzing");
    try {
      let currentSession = session;
      if (!currentSession) {
        currentSession = await api.post<DiagnosticSession>("/api/v1/diagnostics/sessions");
        setSession(currentSession);
      }

      const form = new FormData();
      form.append("image", capturedBlob, "capture.jpg");
      const analyzed = await api.postForm<DiagnosticResult>(
        `/api/v1/diagnostics/sessions/${currentSession.id}/analyze`,
        form
      );
      setResult(analyzed);
      setStep("results");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const detail = err.detail as { message?: string; reasons?: string[] };
        setError(
          `${detail.message || "Image quality insufficient."} ${
            detail.reasons?.length ? `(${detail.reasons.join(", ")})` : ""
          } Please retake the photo.`
        );
        setSession(null);
        setCapturedBlob(null);
        setCapturedUrl(null);
        setStep("camera");
      } else {
        setError("Analysis failed. Please try again.");
        setStep("captured");
      }
    } finally {
      setBusy(false);
    }
  }

  async function fetchClimate() {
    setBusy(true);
    setError(null);
    try {
      const reading = await api.post<ClimateSnapshot>("/api/v1/climate", { region });
      setClimate(reading);
      setStep("formula");
    } catch {
      setError("Could not fetch climate data. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function generateFormula() {
    if (!session || !climate) return;
    setBusy(true);
    setError(null);
    try {
      const f = await api.post<Formula>("/api/v1/formulas", {
        diagnostic_session_id: session.id,
        climate_snapshot_id: climate.id,
      });
      setFormula(f);
    } catch {
      setError("Could not generate a formula. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-brand-800">Skin Diagnostic</h1>

      {error && <div className="card border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

      {step === "intro" && (
        <div className="card space-y-4">
          <p className="text-brand-600">
            This assessment uses your browser camera to estimate cosmetic skin indicators:
            hydration, redness, pore density and barrier strength. It is not a medical
            diagnosis and does not replace a dermatologist.
          </p>
          <button className="btn-primary" onClick={() => setStep("consent")}>
            Continue
          </button>
        </div>
      )}

      {step === "consent" && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-700">Consent to process a facial image</h2>
          <p className="text-sm text-brand-600">
            Your captured photo is processed to produce diagnostic scores and then deleted. It is
            never permanently stored or made publicly accessible.
          </p>
          <button className="btn-primary" onClick={acceptConsent}>
            I agree, continue
          </button>
        </div>
      )}

      {step === "camera" && (
        <div className="card space-y-4">
          <div className="relative aspect-[4/3] bg-brand-900 rounded-xl overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2/3 h-4/5 border-2 border-white/70 rounded-[50%]" />
            </div>
          </div>
          <p className="text-xs text-brand-400">
            Center your face within the outline, in good lighting, and hold still.
          </p>
          <div className="flex gap-3 flex-wrap">
            {!cameraOn && (
              <button className="btn-primary" onClick={startCamera}>
                Enable camera
              </button>
            )}
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
      )}

      {step === "captured" && capturedUrl && (
        <div className="card space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedUrl} alt="Captured preview" className="rounded-xl w-full max-h-96 object-cover" />
          <div className="flex gap-3">
            <button className="btn-primary" onClick={submitCapture} disabled={busy}>
              Use this photo
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setCapturedBlob(null);
                setCapturedUrl(null);
                setStep("camera");
              }}
            >
              Retake
            </button>
          </div>
        </div>
      )}

      {step === "analyzing" && (
        <div className="card text-center py-12">
          <p className="text-brand-500 animate-pulse">Analyzing your capture...</p>
        </div>
      )}

      {step === "results" && result && (
        <div className="card space-y-5">
          <div>
            <h2 className="font-semibold text-brand-700">AI-estimated skin indicators</h2>
            <p className="text-xs text-brand-400">
              Cosmetic estimate only, not a medical diagnosis. Confidence: {Math.round(result.confidence * 100)}%
              {result.confidence < 0.5 && " — this result may be less reliable; consider retaking under better lighting."}
            </p>
          </div>
          <ScoreBar label="Hydration" value={result.hydration} helpText="Higher is more hydrated." />
          <ScoreBar label="Redness" value={result.redness} helpText="Lower means less visible redness." invert />
          <ScoreBar label="Pore density" value={result.pore_density} helpText="Lower means less visible pores." invert />
          <ScoreBar label="Barrier index" value={result.barrier_index} helpText="Higher means a stronger skin barrier." />
          <button className="btn-primary" onClick={() => setStep("climate")}>
            Continue to climate analysis
          </button>
        </div>
      )}

      {step === "climate" && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-700">Where are you based?</h2>
          <p className="text-sm text-brand-500">
            Climate (temperature, humidity) is factored into your personalized formula.
          </p>
          <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} />
          <button className="btn-primary" onClick={fetchClimate} disabled={busy}>
            {busy ? "Fetching..." : "Continue"}
          </button>
        </div>
      )}

      {step === "formula" && climate && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-700">Climate snapshot</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-brand-400">Region</p>
              <p className="font-medium">{climate.region}</p>
            </div>
            <div>
              <p className="text-brand-400">Temperature</p>
              <p className="font-medium">{climate.temperature_c}°C</p>
            </div>
            <div>
              <p className="text-brand-400">Humidity</p>
              <p className="font-medium">{Math.round(climate.humidity * 100)}%</p>
            </div>
          </div>

          {!formula && (
            <button className="btn-primary" onClick={generateFormula} disabled={busy}>
              {busy ? "Generating formula..." : "Generate my formula"}
            </button>
          )}

          {formula && (
            <div className="border-t border-brand-100 pt-4 space-y-3">
              <p className="font-mono text-brand-700">{formula.formula_code}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  formula.status === "VALIDATED" ? "bg-brand-100 text-brand-700" : "bg-red-50 text-red-600"
                }`}
              >
                {formula.status}
              </span>
              {formula.status === "VALIDATED" ? (
                <button className="btn-primary block" onClick={() => router.push(`/formula/${formula.id}`)}>
                  View formula & order
                </button>
              ) : (
                <p className="text-sm text-red-600">{formula.validation_errors.join(" ")}</p>
              )}
            </div>
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
