"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Loader2, ScanFace } from "lucide-react";
import {
  IDX,
  drawFaceMesh,
  analyzeFaceGeometry,
  analyzeIris,
  type NormalizedLandmark,
} from "@/lib/faceAnalysis";
import { CameraView, type CameraViewHandle } from "./CameraView";
import type { FaceResult, IrisResult } from "@/lib/store";

interface Props {
  onComplete: (face: FaceResult, iris: IrisResult) => void;
  onCameraError: (msg: string) => void;
}

const STABLE_MS = 2000;
const CENTROID_WINDOW = 18;
const MAX_DRIFT = 0.04;

export function FaceScanner({ onComplete, onCameraError }: Props) {
  const webcamRef = useRef<CameraViewHandle | null>(null);
  const lmRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const centroidHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const blinkCountRef = useRef(0);
  const blinkActiveRef = useRef(false);
  const blinkStartTimeRef = useRef<number | null>(null);
  const lastLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const capturedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onCameraErrorRef = useRef(onCameraError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onCameraErrorRef.current = onCameraError;
  });

  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [stability, setStability] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled && !lmRef.current) {
        onCameraErrorRef.current?.(
          "Yüz tanıma modeli yüklenemedi (zaman aşımı). Sayfayı yenile.",
        );
      }
    }, 20000);

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm",
        );
        const tryCreate = (delegate: "GPU" | "CPU") =>
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate,
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: true,
          });
        let lm: FaceLandmarker;
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
        lmRef.current = lm;
        setModelReady(true);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error(err);
        onCameraErrorRef.current?.(
          "Yüz tanıma modeli yüklenemedi. Bağlantını kontrol edip tekrar dene.",
        );
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lmRef.current?.close();
      lmRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalize = useCallback(() => {
    const cam = webcamRef.current;
    const video = cam?.video;
    const lms = lastLandmarksRef.current;
    if (!cam || !video || !lms) return;

    // Capture screenshot
    const shot = cam.getScreenshot({ width: 960, height: 720, mirror: true });
    if (!shot) return;

    // Build mesh overlay
    const meshCanvas = document.createElement("canvas");
    const meshUrl = drawFaceMesh(meshCanvas, video, lms);

    const observationSeconds = blinkStartTimeRef.current
      ? (performance.now() - blinkStartTimeRef.current) / 1000
      : 4;

    const irisRes = analyzeIris(
      video,
      lms,
      blinkCountRef.current,
      observationSeconds,
    );
    const faceRes = analyzeFaceGeometry(lms, shot, meshUrl);

    onCompleteRef.current(faceRes, irisRes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!modelReady || !cameraReady) return;
    blinkStartTimeRef.current = performance.now();
    let lastDetect = 0;
    const DETECT_INTERVAL = 60;

    const tick = () => {
      const lm = lmRef.current;
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
      const landmarks = result.faceLandmarks?.[0];

      if (landmarks && landmarks.length > 460) {
        lastLandmarksRef.current = landmarks;
        setFaceDetected(true);

        // Centroid for stability (use eyes + nose)
        const c = landmarks[1]; // nose tip
        const hist = centroidHistoryRef.current;
        hist.push({ x: c.x, y: c.y });
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

        const inFrame = c.x > 0.25 && c.x < 0.75 && c.y > 0.2 && c.y < 0.8;
        const stable = drift < MAX_DRIFT && inFrame;

        // Blink detection from eyelid distance
        const upper = landmarks[IDX.leftEyeUpper];
        const lower = landmarks[IDX.leftEyeLower];
        const inner = landmarks[IDX.leftEyeInner];
        const outer = landmarks[IDX.leftEyeOuter];
        if (upper && lower && inner && outer) {
          const eyeH = Math.abs(lower.y - upper.y);
          const eyeW = Math.abs(outer.x - inner.x);
          const ear = eyeH / Math.max(0.0001, eyeW);
          if (ear < 0.18 && !blinkActiveRef.current) {
            blinkActiveRef.current = true;
          } else if (ear > 0.24 && blinkActiveRef.current) {
            blinkActiveRef.current = false;
            blinkCountRef.current++;
          }
        }

        if (stable) {
          if (stableSinceRef.current === null) stableSinceRef.current = ts;
          const elapsed = ts - stableSinceRef.current;
          setStability(Math.min(1, elapsed / STABLE_MS));
          if (elapsed >= STABLE_MS && !capturedRef.current) {
            capturedRef.current = true;
            finalize();
            return;
          }
        } else {
          stableSinceRef.current = null;
          setStability(0);
        }
      } else {
        setFaceDetected(false);
        stableSinceRef.current = null;
        setStability(0);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [modelReady, cameraReady]);

  return (
    <div className="relative w-full max-w-3xl aspect-[4/3] mx-auto rounded-2xl overflow-hidden bg-black/50"
      style={{
        boxShadow: "0 0 0 1px rgba(165,116,255,0.5), 0 0 30px rgba(165,116,255,0.3), inset 0 0 30px rgba(165,116,255,0.06)"
      }}
    >
      <CameraView
        ref={webcamRef}
        mirrored
        onReady={() => setCameraReady(true)}
        onError={onCameraError}
        className="w-full h-full object-cover"
      />

      {/* Face oval guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg viewBox="0 0 200 260" className="w-[55%] h-[80%] opacity-50">
          <defs>
            <linearGradient id="face-stroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a574ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#4af0d4" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <ellipse
            cx="100"
            cy="130"
            rx="65"
            ry="95"
            fill="none"
            stroke="url(#face-stroke)"
            strokeWidth="1.4"
            strokeDasharray="4 4"
            style={{ filter: "drop-shadow(0 0 6px #a574ff)" }}
          />
        </svg>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(7,6,12,0.85)_100%)]" />

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
        <div className="card-mystic px-3 py-1.5 rounded-full text-xs font-medium tracking-wide flex items-center gap-2">
          {!modelReady ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Yüz motoru hazırlanıyor…</span>
            </>
          ) : !cameraReady ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Kamera hazırlanıyor…</span>
            </>
          ) : faceDetected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-neon-violet animate-pulse" />
              <span className="text-glow-violet">
                Yüz hizalandı — sabit kal
              </span>
            </>
          ) : (
            <>
              <ScanFace className="w-3.5 h-3.5" />
              <span>Yüzünü ovale yerleştir</span>
            </>
          )}
        </div>

        <AnimatePresence>
          {faceDetected && (
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
                  stroke="#a574ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="100.53"
                  animate={{ strokeDashoffset: 100.53 * (1 - stability) }}
                  transition={{ ease: "linear" }}
                  style={{ filter: "drop-shadow(0 0 4px #a574ff)" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-neon-violet">
                {Math.round(stability * 100)}%
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-text-muted tracking-wider uppercase">
          {stability > 0.4
            ? "Sabit kal — yüz mesh'i çiziliyor"
            : "Doğal göz kırp · 2 saniye sabit dur"}
        </p>
      </div>
    </div>
  );
}
