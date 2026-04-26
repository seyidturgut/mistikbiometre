"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  message?: string;
  onRetry: () => void;
}

export function CameraError({ message, onRetry }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-mystic max-w-lg mx-auto p-8 rounded-2xl text-center"
    >
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 ring-1 ring-red-400/30 mb-5">
        <AlertCircle className="w-7 h-7 text-red-300" />
      </div>
      <h2 className="font-serif text-2xl mb-2">Erişim Engellendi</h2>
      <p className="text-text-muted text-sm leading-relaxed mb-6">
        {message ?? "Cihazına erişilemedi."}
        <br />
        Tarayıcı ayarlarından bu siteye kamera/mikrofon izni verip tekrar dene.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neon-cyan/10 ring-1 ring-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 transition-colors text-sm tracking-wide"
      >
        <RotateCcw className="w-4 h-4" />
        Tekrar Dene
      </button>
    </motion.div>
  );
}
