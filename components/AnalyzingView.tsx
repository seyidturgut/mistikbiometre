"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  capturedDataUrl: string;
  edgeMapDataUrl?: string;
  /** ms */
  duration?: number;
  label?: string;
  accent?: "cyan" | "gold" | "violet";
  onComplete: () => void;
}

const ACCENT = {
  cyan: { color: "#4af0d4", glow: "rgba(74,240,212,0.55)" },
  gold: { color: "#f5c542", glow: "rgba(245,197,66,0.55)" },
  violet: { color: "#a574ff", glow: "rgba(165,116,255,0.55)" },
};

export function AnalyzingView({
  capturedDataUrl,
  edgeMapDataUrl,
  duration = 3200,
  label = "İşaretler okunuyor",
  accent = "cyan",
  onComplete,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, duration);
    return () => clearTimeout(t);
  }, [duration, onComplete]);

  const a = ACCENT[accent];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-3xl aspect-[4/3] mx-auto rounded-2xl overflow-hidden ring-glow-cyan bg-black"
    >
      {/* Captured frame (frozen) */}
      <img
        src={capturedDataUrl}
        alt="Yakalanan kare"
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
      />

      {/* Tinted darken */}
      <div className="absolute inset-0 bg-mystic-purple-deep/45 mix-blend-multiply" />

      {/* Neon edge overlay */}
      {edgeMapDataUrl && (
        <motion.img
          src={edgeMapDataUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] mix-blend-screen pointer-events-none"
          style={{ filter: `drop-shadow(0 0 6px ${a.glow})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.95, 0.85, 1] }}
          transition={{ duration: duration / 1000, times: [0, 0.3, 0.6, 1] }}
        />
      )}

      {/* Laser scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[3px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${a.color}, transparent)`,
          boxShadow: `0 0 18px ${a.glow}, 0 0 40px ${a.glow}`,
        }}
        initial={{ top: "0%" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Scan trail */}
      <motion.div
        className="absolute inset-x-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${a.glow} 60%, transparent 100%)`,
          opacity: 0.18,
        }}
        initial={{ top: "-10%" }}
        animate={{ top: ["-10%", "100%", "-10%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sparkle particles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            background: a.color,
            boxShadow: `0 0 8px ${a.color}`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.4, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.1,
            repeat: Infinity,
            repeatDelay: Math.random(),
          }}
        />
      ))}

      {/* Corner brackets */}
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <div
          key={c}
          className={`absolute w-10 h-10 border-2 ${
            c === "tl"
              ? "top-3 left-3 border-r-0 border-b-0"
              : c === "tr"
                ? "top-3 right-3 border-l-0 border-b-0"
                : c === "bl"
                  ? "bottom-3 left-3 border-r-0 border-t-0"
                  : "bottom-3 right-3 border-l-0 border-t-0"
          }`}
          style={{ borderColor: a.color, boxShadow: `0 0 12px ${a.glow}` }}
        />
      ))}

      {/* Bottom label */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <motion.div
          className="inline-flex items-center gap-2 card-mystic px-5 py-2.5 rounded-full"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <Sparkles
            className="w-4 h-4"
            style={{ color: a.color, filter: `drop-shadow(0 0 4px ${a.color})` }}
          />
          <span
            className="font-serif italic text-base tracking-wide"
            style={{ textShadow: `0 0 8px ${a.glow}` }}
          >
            {label}…
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
