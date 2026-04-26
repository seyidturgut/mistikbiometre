"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RotateCcw, Music } from "lucide-react";
import { VoiceScanner } from "@/components/VoiceScanner";
import { CameraError } from "@/components/CameraError";
import { ScanShell } from "@/components/ScanShell";
import { buildVoiceResult, type VoiceCapture } from "@/lib/voiceAnalysis";
import { useMysticStore, type VoiceResult } from "@/lib/store";

type Phase = "scan" | "result" | "error";

export default function VoicePage() {
  const router = useRouter();
  const setVoice = useMysticStore((s) => s.setVoice);
  const [phase, setPhase] = useState<Phase>("scan");
  const [errMsg, setErrMsg] = useState<string>();
  const [voice, setVoiceLocal] = useState<VoiceResult | null>(null);
  const [capture, setCapture] = useState<VoiceCapture | null>(null);

  const handleComplete = useCallback((cap: VoiceCapture) => {
    setCapture(cap);
    const v = buildVoiceResult(cap);
    setVoiceLocal(v);
    setPhase("result");
  }, []);

  return (
    <ScanShell
      step="03 / Vocal Aura"
      title="Sesini Bırak"
      subtitle="5 saniye boyunca 'Om' veya derin nefes — frekansından çakranı okuyacağım"
    >
      <AnimatePresence mode="wait">
        {phase === "scan" && (
          <VoiceScanner
            key="scanner"
            onComplete={handleComplete}
            onError={(m) => {
              setErrMsg(m);
              setPhase("error");
            }}
          />
        )}
        {phase === "result" && voice && capture && (
          <VoiceResults
            key="result"
            voice={voice}
            capture={capture}
            onRestart={() => {
              setPhase("scan");
              setVoiceLocal(null);
              setCapture(null);
            }}
            onContinue={() => {
              setVoice(voice);
              router.push("/result");
            }}
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

function VoiceResults({
  voice,
  capture,
  onRestart,
  onContinue,
}: {
  voice: VoiceResult;
  capture: VoiceCapture;
  onRestart: () => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="card-mystic rounded-3xl p-8 md:p-10 text-center relative overflow-hidden"
        style={{
          boxShadow: `0 0 0 1px ${voice.chakraColor}55, 0 0 40px ${voice.chakraColor}33`,
        }}
      >
        {/* Big chakra orb */}
        <div className="relative w-40 h-40 mx-auto mb-6">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${voice.chakraColor}cc, ${voice.chakraColor}11 70%)`,
              boxShadow: `0 0 60px ${voice.chakraColor}aa`,
            }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Music
              className="w-12 h-12"
              style={{
                color: voice.chakraColor,
                filter: `drop-shadow(0 0 8px ${voice.chakraColor})`,
              }}
            />
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted mb-2">
          Aktif Çakra
        </p>
        <h2
          className="font-serif text-4xl md:text-5xl mb-3"
          style={{
            color: voice.chakraColor,
            textShadow: `0 0 12px ${voice.chakraColor}88`,
          }}
        >
          {voice.chakra}
        </h2>

        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
          <Stat label="Frekans" value={`${capture.avgFrequency.toFixed(0)} Hz`} />
          <Stat label="İstikrar" value={`${(capture.amplitudeStability * 100).toFixed(0)}%`} />
          <Stat label="Bant" value={voice.band === "low" ? "Bas" : voice.band === "mid" ? "Orta" : "Tiz"} />
        </div>

        <p className="font-serif text-base md:text-lg text-text/95 leading-relaxed whitespace-pre-line max-w-xl mx-auto">
          {voice.vocalAura}
        </p>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full ring-1 ring-white/10 hover:ring-white/30 hover:bg-white/5 text-sm tracking-wide transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Tekrar Tara
          </button>
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm tracking-wide transition-colors"
            style={{
              background: `${voice.chakraColor}22`,
              color: voice.chakraColor,
              boxShadow: `0 0 0 1px ${voice.chakraColor}88`,
            }}
          >
            Mistik Kimliğine Geç
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-mystic rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="font-mono text-base text-text">{value}</p>
    </div>
  );
}
