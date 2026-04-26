"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface CameraViewHandle {
  video: HTMLVideoElement | null;
  /** Capture a snapshot of the current frame as a PNG data URL. */
  getScreenshot: (opts?: { width?: number; height?: number; mirror?: boolean }) => string | null;
}

interface Props {
  className?: string;
  mirrored?: boolean;
  /** Camera to request: "user" (front) or "environment" (back). */
  facingMode?: "user" | "environment";
  onReady?: () => void;
  onError?: (msg: string) => void;
}

/**
 * Native getUserMedia camera view with imperative screenshot API.
 * Replaces react-webcam to avoid React 19 compatibility issues.
 */
export const CameraView = forwardRef<CameraViewHandle, Props>(function CameraView(
  { className, mirrored = true, facingMode = "user", onReady, onError },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const [active, setActive] = useState(false);

  // Keep latest callbacks without re-triggering the camera setup effect.
  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  });

  useImperativeHandle(
    ref,
    () => ({
      get video() {
        return videoRef.current;
      },
      getScreenshot: ({ width, height, mirror = mirrored } = {}) => {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return null;
        const w = width ?? v.videoWidth;
        const h = height ?? v.videoHeight;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return null;
        if (mirror) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(v, 0, 0, w, h);
        return c.toDataURL("image/png");
      },
    }),
    [mirrored],
  );

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          onErrorRef.current?.("Tarayıcın kamera erişimini desteklemiyor.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.muted = true;
        v.playsInline = true;
        try {
          await v.play();
        } catch {
          // autoplay blocked — user has already interacted to reach this page
        }
        setActive(true);
        onReadyRef.current?.();
      } catch (err) {
        const e = err as DOMException;
        const msg =
          e?.name === "NotAllowedError"
            ? "Kamera izni reddedildi."
            : e?.name === "NotFoundError"
              ? "Bağlı bir kamera bulunamadı."
              : e?.name === "NotReadableError"
                ? "Kamera başka bir uygulama tarafından kullanılıyor."
                : e?.message ?? "Kameraya erişilemedi.";
        onErrorRef.current?.(msg);
      }
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };
    // Re-run only when the requested facing mode changes; callbacks live in
    // refs so parent re-renders don't restart the stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className={className}
      style={
        mirrored
          ? { transform: "scaleX(-1)", WebkitTransform: "scaleX(-1)" }
          : undefined
      }
      data-active={active}
    />
  );
});
