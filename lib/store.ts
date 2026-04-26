"use client";

import { create } from "zustand";
import type { PalmAnalysis, Reading } from "./types";

// MediaPipe's wasm pipes its stderr (incl. harmless "INFO: ..." lines from
// TensorFlow Lite) through console.error, which Next.js dev overlay then
// surfaces as a runtime "Console Error". Filter those specific lines so the
// overlay only fires on real errors. Runs once at module init.
if (typeof window !== "undefined" && !(window as unknown as { __mpFilter?: boolean }).__mpFilter) {
  (window as unknown as { __mpFilter?: boolean }).__mpFilter = true;
  const origError = console.error.bind(console);
  // MediaPipe wasm prints "INFO:", "W0426 ...", "I0000 ..." etc. through stderr.
  const benign = /^(INFO:|[IW]\d{3,4}\s|VERBOSE:)/;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && benign.test(first)) {
      console.info(...args);
      return;
    }
    origError(...args);
  };
}

export interface FaceResult {
  capturedDataUrl: string;
  meshDataUrl?: string;
  ratios: {
    forehead: number; // upper face / total
    jawline: number; // jaw width / cheekbone width
    eyeSpacing: number; // inter-eye / face width
  };
  levels: {
    intellect: "low" | "medium" | "high";
    willpower: "low" | "medium" | "high";
    perception: "low" | "medium" | "high";
  };
  archetype: string;
  archetypeDescription: string;
  traits: { intellect: string; willpower: string; perception: string };
}

export interface IrisResult {
  dominantColor: { r: number; g: number; b: number };
  colorName: string;
  blinkRate: number; // blinks per ~10s observation
  soulAge: string;
  element: string;
  description: string;
}

export interface VoiceResult {
  avgFrequency: number; // Hz
  amplitudeStability: number; // 0..1
  band: "low" | "mid" | "high";
  chakra: string;
  chakraColor: string;
  vocalAura: string;
}

export interface PalmResult {
  analysis: PalmAnalysis;
  reading: Reading;
}

interface MysticState {
  palm: PalmResult | null;
  face: FaceResult | null;
  iris: IrisResult | null;
  voice: VoiceResult | null;

  setPalm: (p: PalmResult) => void;
  setFace: (f: FaceResult) => void;
  setIris: (i: IrisResult) => void;
  setVoice: (v: VoiceResult) => void;
  reset: () => void;

  /** ordered list of completed scanners */
  completionOrder: ("palm" | "face" | "iris" | "voice")[];
}

export const useMysticStore = create<MysticState>((set) => ({
  palm: null,
  face: null,
  iris: null,
  voice: null,
  completionOrder: [],
  setPalm: (palm) =>
    set((s) => ({
      palm,
      completionOrder: [
        ...s.completionOrder.filter((x) => x !== "palm"),
        "palm",
      ],
    })),
  setFace: (face) =>
    set((s) => ({
      face,
      completionOrder: [
        ...s.completionOrder.filter((x) => x !== "face"),
        "face",
      ],
    })),
  setIris: (iris) =>
    set((s) => ({
      iris,
      completionOrder: [
        ...s.completionOrder.filter((x) => x !== "iris"),
        "iris",
      ],
    })),
  setVoice: (voice) =>
    set((s) => ({
      voice,
      completionOrder: [
        ...s.completionOrder.filter((x) => x !== "voice"),
        "voice",
      ],
    })),
  reset: () =>
    set({
      palm: null,
      face: null,
      iris: null,
      voice: null,
      completionOrder: [],
    }),
}));
