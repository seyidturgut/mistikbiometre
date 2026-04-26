"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Loader2, Hand as HandIcon } from "lucide-react";
import { HandOutline } from "./HandOutline";
import { CameraView, type CameraViewHandle } from "./CameraView";
import type { CaptureResult, Handedness } from "@/lib/types";

interface Props {
  onCapture: (r: CaptureResult) => void;
  onCameraError: (msg: string) => void;
}

const STABLE_MS = 1400;
const CENTROID_WINDOW = 7;
const MAX_DRIFT = 0.14; // normalized — tolerates natural hand jitter
const STABILITY_GRACE_MS = 350; // brief unstable frames don't reset the timer
const HAND_TIMEOUT_MS = 4500; // force capture if hand has been seen this long

export function Scanner({ onCapture, onCameraError }: Props) {
  const webcamRef = useRef<CameraViewHandle | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const lastStableTsRef = useRef<number | null>(null);
  const handFirstSeenRef = useRef<number | null>(null);
  const handLastSeenRef = useRef<number | null>(null);
  const centroidHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const lastCaptureRef = useRef(false);
  const lastStabilityValueRef = useRef(0);
  const lastHandDetectedRef = useRef(false);
  const onCameraErrorRef = useRef(onCameraError);
  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    onCameraErrorRef.current = onCameraError;
    onCaptureRef.current = onCapture;
  });

  // Throttled state setters: avoid 16Hz React re-renders.
  const setStabilityThrottled = (next: number) => {
    const last = lastStabilityValueRef.current;
    if (Math.abs(next - last) >= 0.05 || next === 0 || next === 1) {
      lastStabilityValueRef.current = next;
      setStability(next);
    }
  };
  const setHandDetectedThrottled = (next: boolean) => {
    if (lastHandDetectedRef.current !== next) {
      lastHandDetectedRef.current = next;
      setHandDetected(next);
    }
  };

  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [stability, setStability] = useState(0); // 0..1 progress
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const facingModeRef = useRef(facingMode);
  useEffect(() => {
    facingModeRef.current = facingMode;
  });

  // ---- Init MediaPipe Hand Landmarker ----
  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled && !landmarkerRef.current) {
        onCameraErrorRef.current?.(
          "El tanıma modeli yüklenemedi (zaman aşımı). Sayfayı yenile.",
        );
      }
    }, 20000);

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm",
        );
        const tryCreate = async (delegate: "GPU" | "CPU") =>
          HandLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate,
            },
            runningMode: "VIDEO",
            numHands: 1,
          });
        let lm: HandLandmarker;
        try {
          lm = await tryCreate("GPU");
        } catch (gpuErr) {
          console.warn("GPU delegate failed, falling back to CPU", gpuErr);
          lm = await tryCreate("CPU");
        }
        clearTimeout(timeoutId);
        if (cancelled) {
          lm.close();
          return;
        }
        landmarkerRef.current = lm;
        setModelReady(true);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Hand Landmarker init failed", err);
        onCameraErrorRef.current?.(
          "El tanıma modeli yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.",
        );
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Detection loop ----
  useEffect(() => {
    if (!modelReady || !cameraReady) return;
    let lastDetect = 0;
    const DETECT_INTERVAL = 60; // ~16 fps — leaves CPU headroom
    const tick = () => {
      const lm = landmarkerRef.current;
      const cam = webcamRef.current;
      const video = cam?.video;
      if (!lm || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ts = performance.now();
      if (ts - lastDetect < DETECT_INTERVAL) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastDetect = ts;
      const result = lm.detectForVideo(video, ts);
      const landmarks = result.landmarks?.[0];
      const handedness = result.handednesses?.[0]?.[0]?.categoryName as
        | Handedness
        | undefined;

      if (landmarks && handedness) {
        // Centroid of palm-ish points: indices 0 (wrist), 5, 9, 13, 17 (MCPs)
        const idx = [0, 5, 9, 13, 17];
        let cx = 0;
        let cy = 0;
        for (const i of idx) {
          cx += landmarks[i].x;
          cy += landmarks[i].y;
        }
        cx /= idx.length;
        cy /= idx.length;

        const hist = centroidHistoryRef.current;
        hist.push({ x: cx, y: cy });
        if (hist.length > CENTROID_WINDOW) hist.shift();

        const drift = (() => {
          if (hist.length < 4) return 1;
          let minX = 1, minY = 1, maxX = 0, maxY = 0;
          for (const p of hist) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
          return Math.max(maxX - minX, maxY - minY);
        })();

        const inFrame = cx > 0.10 && cx < 0.90 && cy > 0.08 && cy < 0.92;
        const stable = drift < MAX_DRIFT && inFrame;

        setHandDetectedThrottled(true);
        if (handFirstSeenRef.current === null) handFirstSeenRef.current = ts;
        handLastSeenRef.current = ts;
        const handAge = ts - (handFirstSeenRef.current ?? ts);
        const forceCapture = inFrame && handAge >= HAND_TIMEOUT_MS;

        if (stable || forceCapture) {
          if (stableSinceRef.current === null) stableSinceRef.current = ts;
          lastStableTsRef.current = ts;
          const elapsed = ts - stableSinceRef.current;
          setStabilityThrottled(Math.min(1, elapsed / STABLE_MS));

          if ((elapsed >= STABLE_MS || forceCapture) && !lastCaptureRef.current) {
            lastCaptureRef.current = true;
            // Compute bbox in normalized coords -> px
            const xs = landmarks.map((p) => p.x);
            const ys = landmarks.map((p) => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            const shot = cam.getScreenshot({
              width: 960,
              height: 720,
              mirror: facingModeRef.current === "user",
            });
            if (shot) {
              const w = 960;
              const h = 720;
              onCaptureRef.current({
                imageDataUrl: shot,
                handedness: handedness ?? "Right",
                bbox: {
                  x: minX * w,
                  y: minY * h,
                  w: (maxX - minX) * w,
                  h: (maxY - minY) * h,
                },
              });
              return; // stop loop on capture
            }
          }
        } else {
          // Brief unstable frames within grace window don't reset progress.
          const sinceLastStable =
            lastStableTsRef.current === null
              ? Infinity
              : ts - lastStableTsRef.current;
          if (sinceLastStable > STABILITY_GRACE_MS) {
            stableSinceRef.current = null;
            setStabilityThrottled(0);
          }
        }
      } else {
        // Hand momentarily missing from a single frame doesn't reset the
        // entire timer — give it 700ms grace before doing a full cleanup.
        const sinceLastSeen =
          handLastSeenRef.current === null
            ? Infinity
            : ts - handLastSeenRef.current;
        if (sinceLastSeen > 700) {
          setHandDetectedThrottled(false);
          stableSinceRef.current = null;
          lastStableTsRef.current = null;
          handFirstSeenRef.current = null;
          handLastSeenRef.current = null;
          centroidHistoryRef.current = [];
          setStabilityThrottled(0);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [modelReady, cameraReady]);

  return (
    <div className="relative w-full max-w-3xl aspect-[4/3] mx-auto rounded-2xl overflow-hidden ring-glow-cyan bg-black/50">
      <CameraView
        ref={webcamRef}
        mirrored={facingMode === "user"}
        facingMode={facingMode}
        onReady={() => setCameraReady(true)}
        onError={onCameraError}
        className="w-full h-full object-cover"
      />

      {/* Hand outline guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <HandOutline className="w-[42%] h-[80%] opacity-50" />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(7,6,12,0.85)_100%)]" />

      {/* Status pill */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
        <div className="card-mystic px-3 py-1.5 rounded-full text-xs font-medium tracking-wide flex items-center gap-2">
          {!modelReady ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Mistik motor uyanıyor…</span>
            </>
          ) : !cameraReady ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Kamera hazırlanıyor…</span>
            </>
          ) : handDetected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-glow-cyan">El algılandı, sabit tut</span>
            </>
          ) : (
            <>
              <HandIcon className="w-3.5 h-3.5" />
              <span>Avucunu kareye getir</span>
            </>
          )}
        </div>

        {/* Stability ring */}
        <AnimatePresence>
          {handDetected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative w-12 h-12"
            >
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="2.5"
                />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#4af0d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="100.53"
                  animate={{ strokeDashoffset: 100.53 * (1 - stability) }}
                  transition={{ ease: "linear" }}
                  style={{ filter: "drop-shadow(0 0 4px #4af0d4)" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-neon-cyan">
                {Math.round(stability * 100)}%
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera flip — useful on mobile for using the back camera */}
      <button
        type="button"
        onClick={() =>
          setFacingMode((m) => (m === "user" ? "environment" : "user"))
        }
        className="absolute bottom-4 right-4 card-mystic px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider hover:bg-white/5 transition-colors"
      >
        ↻ {facingMode === "user" ? "Ön" : "Arka"}
      </button>

      {/* Bottom hint */}
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-text-muted tracking-wider uppercase">
          {stability > 0.4
            ? "Sabit kal — tarama başlıyor"
            : "El silüetiyle hizala · 2 saniye sabit tut"}
        </p>
      </div>
    </div>
  );
}
