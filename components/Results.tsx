"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Briefcase,
  Leaf,
  Sparkles,
  ChevronDown,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import type { PalmAnalysis, Reading } from "@/lib/types";

interface Props {
  analysis: PalmAnalysis;
  reading: Reading;
  onRestart: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

const cards = [
  { key: "love", title: "Aşk & İlişkiler", icon: Heart, accent: "#ff6fa5" },
  { key: "career", title: "Kariyer & Para", icon: Briefcase, accent: "#f5c542" },
  { key: "health", title: "Sağlık & Enerji", icon: Leaf, accent: "#4af0d4" },
  {
    key: "conclusion",
    title: "Mistik Sonuç",
    icon: Sparkles,
    accent: "#a574ff",
  },
] as const;

export function Results({
  analysis,
  reading,
  onRestart,
  onContinue,
  continueLabel,
}: Props) {
  const [open, setOpen] = useState<string | null>("love");
  const score = analysis.auraScore;
  const scoreColor =
    score < 40 ? "#a574ff" : score < 70 ? "#4af0d4" : "#f5c542";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-5xl mx-auto px-4"
    >
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        {/* Left: captured + edge map */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden ring-glow-cyan bg-black/40">
            <img
              src={analysis.capturedDataUrl}
              alt="Avucun"
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            <img
              src={analysis.edgeMapDataUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] mix-blend-screen opacity-90"
              style={{ filter: "drop-shadow(0 0 4px rgba(74,240,212,0.5))" }}
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] font-mono tracking-wider text-neon-cyan ring-1 ring-neon-cyan/30">
              {analysis.handedness === "Right" ? "SAĞ EL" : "SOL EL"}
            </div>
          </div>

          {/* Aura score */}
          <div className="card-mystic rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-widest text-text-muted">
                Mistik Aura Skoru
              </span>
              <span
                className="font-mono text-lg font-semibold"
                style={{ color: scoreColor, textShadow: `0 0 8px ${scoreColor}` }}
              >
                {score}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}cc)`,
                  boxShadow: `0 0 12px ${scoreColor}`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Right: readings */}
        <div>
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-neon-cyan/80 mb-1">
              Avuç Okuması
            </p>
            <h2 className="font-serif text-4xl md:text-5xl leading-tight">
              Çizgilerin{" "}
              <span className="italic text-glow-gold text-neon-gold">
                konuştu
              </span>
            </h2>
          </div>

          <p className="font-serif text-lg italic text-text/95 leading-relaxed mb-6 border-l-2 border-neon-cyan/40 pl-4">
            {reading.intro}
          </p>

          <div className="space-y-3">
            {cards.map(({ key, title, icon: Icon, accent }) => {
              const isOpen = open === key;
              const text = reading[key as keyof Reading];
              return (
                <div
                  key={key}
                  className="card-mystic rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : key)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${accent}1a`,
                        boxShadow: `0 0 20px ${accent}33`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: accent }} />
                    </div>
                    <span className="flex-1 font-medium tracking-wide">
                      {title}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-5 h-5 text-text-muted" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0">
                          <div
                            className="h-px w-full mb-4"
                            style={{
                              background: `linear-gradient(90deg, ${accent}66, transparent)`,
                            }}
                          />
                          <p className="font-serif text-lg leading-relaxed text-text/95">
                            {text}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
            {onContinue && (
              <button
                onClick={onContinue}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neon-cyan/15 ring-1 ring-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/25 transition-colors text-sm tracking-wide"
              >
                {continueLabel ?? "Devam Et"}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
