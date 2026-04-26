"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Brain, Zap, ArrowRight, RotateCcw } from "lucide-react";
import { FaceScanner } from "@/components/FaceScanner";
import { AnalyzingView } from "@/components/AnalyzingView";
import { CameraError } from "@/components/CameraError";
import { ScanShell } from "@/components/ScanShell";
import { useMysticStore, type FaceResult, type IrisResult } from "@/lib/store";
import { enhanceFaceWithGrok } from "@/lib/grok";

type Phase = "scan" | "analyzing" | "result" | "error";

export default function FaceIrisPage() {
  const router = useRouter();
  const setFace = useMysticStore((s) => s.setFace);
  const setIris = useMysticStore((s) => s.setIris);
  const [phase, setPhase] = useState<Phase>("scan");
  const [errMsg, setErrMsg] = useState<string>();
  const [face, setFaceLocal] = useState<FaceResult | null>(null);
  const [iris, setIrisLocal] = useState<IrisResult | null>(null);

  const handleComplete = useCallback((f: FaceResult, i: IrisResult) => {
    setFaceLocal(f);
    setIrisLocal(i);
    setPhase("analyzing");
    // Background enhancement; if Grok succeeds it overrides local strings
    // before AnalyzingView's 3.5s timer hands off to results.
    enhanceFaceWithGrok(f)
      .then((enhanced) => setFaceLocal(enhanced))
      .catch(() => undefined);
  }, []);

  const handleRestart = () => {
    setPhase("scan");
    setFaceLocal(null);
    setIrisLocal(null);
    setErrMsg(undefined);
  };

  const handleContinue = () => {
    if (face && iris) {
      setFace(face);
      setIris(iris);
    }
    router.push("/scan/voice");
  };

  return (
    <ScanShell
      step="02 / Physiognomy + Iris"
      title="Yüzünü ve Gözlerini Göster"
      subtitle="Yüzünü ovale yerleştir, doğal şekilde göz kırp"
    >
      <AnimatePresence mode="wait">
        {phase === "scan" && (
          <FaceScanner
            key="scanner"
            onComplete={handleComplete}
            onCameraError={(m) => {
              setErrMsg(m);
              setPhase("error");
            }}
          />
        )}
        {phase === "analyzing" && face && (
          <AnalyzingView
            key="analyzing"
            capturedDataUrl={face.capturedDataUrl}
            edgeMapDataUrl={face.meshDataUrl}
            label="Geometrini ve gözlerini okuyorum"
            accent="violet"
            duration={3500}
            onComplete={() => setPhase("result")}
          />
        )}
        {phase === "result" && face && iris && (
          <FaceResults
            key="result"
            face={face}
            iris={iris}
            onRestart={handleRestart}
            onContinue={handleContinue}
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

function FaceResults({
  face,
  iris,
  onRestart,
  onContinue,
}: {
  face: FaceResult;
  iris: IrisResult;
  onRestart: () => void;
  onContinue: () => void;
}) {
  const traitCards = [
    {
      label: "Akıl",
      icon: Brain,
      text: face.traits.intellect,
      level: face.levels.intellect,
      accent: "#4af0d4",
    },
    {
      label: "İrade",
      icon: Zap,
      text: face.traits.willpower,
      level: face.levels.willpower,
      accent: "#f5c542",
    },
    {
      label: "Algı",
      icon: Eye,
      text: face.traits.perception,
      level: face.levels.perception,
      accent: "#a574ff",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-5xl mx-auto"
    >
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        <div className="space-y-4">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black/40"
            style={{ boxShadow: "0 0 0 1px rgba(165,116,255,0.5), 0 0 30px rgba(165,116,255,0.25)" }}
          >
            <img
              src={face.capturedDataUrl}
              alt="Yüzün"
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            {face.meshDataUrl && (
              <img
                src={face.meshDataUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1] mix-blend-screen opacity-90"
              />
            )}
          </div>

          {/* Iris card */}
          <div className="card-mystic rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-full ring-2 ring-white/20"
                style={{
                  background: `rgb(${iris.dominantColor.r}, ${iris.dominantColor.g}, ${iris.dominantColor.b})`,
                  boxShadow: `0 0 16px rgba(${iris.dominantColor.r}, ${iris.dominantColor.g}, ${iris.dominantColor.b}, 0.7)`,
                }}
              />
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-text-muted">
                  İris · {iris.colorName}
                </p>
                <p className="font-serif text-lg leading-tight">
                  {iris.soulAge}
                </p>
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Element: <span className="text-text">{iris.element}</span> ·
              Göz kırpma: <span className="text-text">{iris.blinkRate.toFixed(0)}/dk</span>
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neon-violet/80 mb-1">
            Arketipin
          </p>
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-3">
            <span className="italic text-glow-violet text-neon-violet">
              {face.archetype}
            </span>
          </h2>
          <p className="font-serif text-lg text-text/95 leading-relaxed mb-6">
            {face.archetypeDescription}
          </p>
          <p className="font-serif text-base text-text/90 leading-relaxed mb-6 italic">
            {iris.description}
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            {traitCards.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.label}
                  className="card-mystic rounded-xl p-4"
                  style={{
                    boxShadow: `0 0 0 1px ${t.accent}33, 0 8px 30px -10px ${t.accent}33`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{
                        background: `${t.accent}1a`,
                        boxShadow: `inset 0 0 16px ${t.accent}22`,
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: t.accent }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider"
                      style={{ color: t.accent }}
                    >
                      {t.level === "high"
                        ? "Yüksek"
                        : t.level === "medium"
                          ? "Dengeli"
                          : "Düşük"}
                    </span>
                  </div>
                  <p
                    className="font-serif italic text-lg mb-2"
                    style={{ color: t.accent }}
                  >
                    {t.label}
                  </p>
                  <p className="text-sm text-text/85 leading-relaxed">
                    {t.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={onRestart}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full ring-1 ring-white/10 hover:ring-white/30 hover:bg-white/5 text-sm tracking-wide transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Tekrar Tara
            </button>
            <button
              onClick={onContinue}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neon-violet/15 ring-1 ring-neon-violet/50 text-neon-violet hover:bg-neon-violet/25 transition-colors text-sm tracking-wide"
            >
              Sese Geç
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
