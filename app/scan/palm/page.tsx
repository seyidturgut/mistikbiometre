"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Scanner } from "@/components/Scanner";
import { AnalyzingView } from "@/components/AnalyzingView";
import { Results } from "@/components/Results";
import { CameraError } from "@/components/CameraError";
import { ScanShell } from "@/components/ScanShell";
import { analyzePalm } from "@/lib/palmAnalysis";
import { generateReading } from "@/lib/readings";
import { useMysticStore } from "@/lib/store";
import type { CaptureResult, PalmAnalysis, Reading } from "@/lib/types";

type Phase = "scan" | "analyzing" | "result" | "error";

export default function PalmPage() {
  const router = useRouter();
  const setPalm = useMysticStore((s) => s.setPalm);
  const [phase, setPhase] = useState<Phase>("scan");
  const [errMsg, setErrMsg] = useState<string>();
  const [analysis, setAnalysis] = useState<PalmAnalysis | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [captured, setCaptured] = useState<CaptureResult | null>(null);
  const [animationDone, setAnimationDone] = useState(false);

  const handleCapture = useCallback(async (cap: CaptureResult) => {
    setCaptured(cap);
    setAnimationDone(false);
    setAnalysis(null);
    setReading(null);
    setPhase("analyzing");
    try {
      const a = await analyzePalm(cap.imageDataUrl, cap.handedness);
      const r = generateReading(a);
      setAnalysis(a);
      setReading(r);
    } catch (err) {
      console.error(err);
      setErrMsg(
        "OpenCV motoru yüklenemedi. Sayfayı yenileyip tekrar dene.",
      );
      setPhase("error");
    }
  }, []);

  // Transition to results when both the visual animation has finished AND
  // the OpenCV analysis is ready. Either may complete first.
  useEffect(() => {
    if (phase === "analyzing" && animationDone && analysis && reading) {
      setPhase("result");
    }
  }, [phase, animationDone, analysis, reading]);

  const handleRestart = () => {
    setPhase("scan");
    setCaptured(null);
    setAnalysis(null);
    setReading(null);
    setAnimationDone(false);
    setErrMsg(undefined);
  };

  const handleContinue = () => {
    if (analysis && reading) {
      setPalm({ analysis, reading });
    }
    router.push("/scan/face-iris");
  };

  return (
    <ScanShell
      step="01 / Chiromancy"
      title="Avucunu Göster"
      subtitle="Hand outline ile hizala, 2 saniye sabit tut"
    >
      <AnimatePresence mode="wait">
        {phase === "scan" && (
          <Scanner
            key="scanner"
            onCapture={handleCapture}
            onCameraError={(m) => {
              setErrMsg(m);
              setPhase("error");
            }}
          />
        )}
        {phase === "analyzing" && captured && (
          <AnalyzingView
            key="analyzing"
            capturedDataUrl={captured.imageDataUrl}
            edgeMapDataUrl={analysis?.edgeMapDataUrl}
            label={
              analysis ? "Çizgilerini okuyorum" : "Mistik motor uyanıyor"
            }
            accent="cyan"
            onComplete={() => setAnimationDone(true)}
          />
        )}
        {phase === "result" && analysis && reading && (
          <Results
            key="result"
            analysis={analysis}
            reading={reading}
            onRestart={handleRestart}
            onContinue={handleContinue}
            continueLabel="Yüz Taramasına Geç"
          />
        )}
        {phase === "error" && (
          <CameraError
            key="error"
            message={errMsg}
            onRetry={() => {
              setPhase("scan");
              setErrMsg(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </ScanShell>
  );
}
