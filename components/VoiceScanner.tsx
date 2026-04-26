"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import type { VoiceCapture } from "@/lib/voiceAnalysis";

interface Props {
  durationSec?: number;
  onComplete: (cap: VoiceCapture) => void;
  onError: (msg: string) => void;
}

export function VoiceScanner({
  durationSec = 5,
  onComplete,
  onError,
}: Props) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const samplesRef = useRef<{ freq: number; amp: number }[]>([]);
  const startTimeRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0); // 0..1 instantaneous amplitude
  const [pitch, setPitch] = useState(0);
  const [progress, setProgress] = useState(0);
  const [permState, setPermState] = useState<"idle" | "loading" | "ready" | "denied">("idle");

  const initMic = useCallback(async () => {
    try {
      setPermState("loading");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;
      setPermState("ready");
    } catch (err) {
      setPermState("denied");
      onError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Mikrofon izni reddedildi."
          : "Mikrofona erişilemedi.",
      );
    }
  }, [onError]);

  useEffect(() => {
    initMic();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, [initMic]);

  const start = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    if (!analyser || !ctx) return;
    samplesRef.current = [];
    setRecording(true);
    startTimeRef.current = performance.now();

    const buf = new Float32Array(analyser.fftSize);

    /**
     * Autocorrelation pitch detection (Chris Wilson style). Operates on
     * time-domain samples and returns the fundamental frequency in Hz, or
     * 0 if no clear pitch is found. Robust to harmonics — unlike FFT-peak
     * which often locks onto the strongest overtone for human voice.
     */
    const autocorrPitch = (samples: Float32Array, sampleRate: number) => {
      const SIZE = samples.length;
      let rmsLocal = 0;
      for (let i = 0; i < SIZE; i++) rmsLocal += samples[i] * samples[i];
      rmsLocal = Math.sqrt(rmsLocal / SIZE);
      if (rmsLocal < 0.01) return 0;

      // Trim leading/trailing silence
      let r1 = 0;
      let r2 = SIZE - 1;
      const threshold = 0.2;
      for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(samples[i]) < threshold) {
          r1 = i;
          break;
        }
      }
      for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(samples[SIZE - i]) < threshold) {
          r2 = SIZE - i;
          break;
        }
      }
      const trimmed = samples.subarray(r1, r2);
      const N = trimmed.length;
      if (N < 64) return 0;

      const c = new Float32Array(N);
      for (let lag = 0; lag < N; lag++) {
        let sum = 0;
        for (let j = 0; j < N - lag; j++) sum += trimmed[j] * trimmed[j + lag];
        c[lag] = sum;
      }

      // First descent past zero (skip DC peak)
      let d = 0;
      while (d < N - 1 && c[d] > c[d + 1]) d++;

      // Find subsequent maximum
      let maxVal = -1;
      let maxLag = -1;
      for (let i = d; i < N; i++) {
        if (c[i] > maxVal) {
          maxVal = c[i];
          maxLag = i;
        }
      }
      if (maxLag <= 0) return 0;

      // Parabolic interpolation for sub-bin accuracy
      const x1 = c[maxLag - 1] ?? c[maxLag];
      const x2 = c[maxLag];
      const x3 = c[maxLag + 1] ?? c[maxLag];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      const refined = a !== 0 ? maxLag - b / (2 * a) : maxLag;

      const hz = sampleRate / refined;
      if (hz < 50 || hz > 1000) return 0;
      return hz;
    };

    const tick = () => {
      const elapsed = (performance.now() - (startTimeRef.current ?? 0)) / 1000;
      const p = Math.min(1, elapsed / durationSec);
      setProgress(p);

      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const ampNorm = Math.min(1, rms * 6);
      setLevel(ampNorm);

      const dominant = autocorrPitch(buf, ctx.sampleRate);
      if (dominant > 0) setPitch(dominant);

      if (rms > 0.01 && dominant > 60 && dominant < 800) {
        samplesRef.current.push({ freq: dominant, amp: ampNorm });
      }

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        finalize();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [durationSec]);

  const finalize = useCallback(() => {
    setRecording(false);
    const samples = samplesRef.current;
    if (samples.length < 5) {
      onError("Sesin yeterince yakalanmadı. Tekrar dene.");
      return;
    }
    const avgFreq =
      samples.reduce((a, s) => a + s.freq, 0) / samples.length;
    const avgAmp = samples.reduce((a, s) => a + s.amp, 0) / samples.length;
    const variance =
      samples.reduce((a, s) => a + (s.amp - avgAmp) ** 2, 0) / samples.length;
    const stdev = Math.sqrt(variance);
    const stability = Math.max(0, Math.min(1, 1 - stdev / 0.4));

    onComplete({
      avgFrequency: avgFreq,
      amplitudeStability: stability,
      freqSamples: samples.map((s) => s.freq),
      ampSamples: samples.map((s) => s.amp),
    });
  }, [onComplete]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="card-mystic rounded-3xl p-8 md:p-12 text-center"
        style={{ boxShadow: "0 0 0 1px rgba(245,197,66,0.4), 0 0 40px rgba(245,197,66,0.2)" }}
      >
        {/* Pulsing visualizer */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Outer rings */}
          {[1, 1.25, 1.5].map((s, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px solid rgba(245,197,66,0.3)",
                boxShadow: "0 0 24px rgba(245,197,66,0.15)",
              }}
              animate={{
                scale: recording ? [s, s + level * 0.6, s] : s,
                opacity: recording ? [0.4, 0.7, 0.4] : 0.3,
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}

          {/* Core orb */}
          <motion.div
            className="absolute inset-12 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(245,197,66,0.6), rgba(245,197,66,0.05) 70%)",
              boxShadow: "0 0 40px rgba(245,197,66,0.5)",
            }}
            animate={{
              scale: recording ? 1 + level * 0.3 : 1,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />

          {/* Mic icon center */}
          <div className="absolute inset-0 flex items-center justify-center">
            {permState === "loading" ? (
              <Loader2 className="w-10 h-10 animate-spin text-neon-gold" />
            ) : permState === "denied" ? (
              <MicOff className="w-10 h-10 text-red-300" />
            ) : (
              <Mic
                className="w-10 h-10 text-neon-gold"
                style={{ filter: "drop-shadow(0 0 8px #f5c542)" }}
              />
            )}
          </div>

          {/* Progress arc */}
          {recording && (
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 -rotate-90"
            >
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="rgba(245,197,66,0.15)"
                strokeWidth="1"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="#f5c542"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="301.6"
                animate={{ strokeDashoffset: 301.6 * (1 - progress) }}
                transition={{ ease: "linear" }}
                style={{ filter: "drop-shadow(0 0 4px #f5c542)" }}
              />
            </svg>
          )}
        </div>

        <p className="text-xs uppercase tracking-[0.3em] text-neon-gold/80 mb-2">
          Vocal Aura
        </p>
        <h2 className="font-serif text-3xl mb-3">
          {recording ? "Dinliyorum…" : "Derin bir nefes al"}
        </h2>
        <p className="text-text-muted text-sm leading-relaxed mb-6 max-w-md mx-auto">
          {recording
            ? `“Om” deyip sesini ${durationSec} saniye uzat. Frekansını ölçüyorum.`
            : "Butona bastığında 5 saniye boyunca rahat bir 'Ommm' sesi çıkar — ya da derin nefes ver. Frekansından çakranı okuyacağım."}
        </p>

        {recording && (
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6 text-left">
            <div className="card-mystic rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                Frekans
              </p>
              <p className="font-mono text-xl text-neon-gold">
                {pitch.toFixed(0)} Hz
              </p>
            </div>
            <div className="card-mystic rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                Şiddet
              </p>
              <p className="font-mono text-xl text-neon-gold">
                {(level * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        <button
          onClick={start}
          disabled={permState !== "ready" || recording}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neon-gold/15 ring-1 ring-neon-gold/50 text-neon-gold hover:bg-neon-gold/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wide"
        >
          <Mic className="w-4 h-4" />
          {recording ? "Kayıt sürüyor…" : "Tarama Başla"}
        </button>
      </div>
    </div>
  );
}
