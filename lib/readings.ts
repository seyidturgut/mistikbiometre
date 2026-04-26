import readingsData from "@/data/readings.json";
import type { PalmAnalysis, Reading } from "./types";

/**
 * mulberry32 — fast, well-distributed deterministic 32-bit PRNG.
 * Same seed always yields the same sequence, so the same hand always
 * produces the same reading.
 */
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a deterministic seed from the analysis. We mix the raw edge-pixel
 * derived `auraScore` with each zone density (rounded to a fine integer
 * grid) plus handedness — small differences between hands therefore land
 * in entirely different mulberry32 sequences.
 */
function seedFromAnalysis(analysis: PalmAnalysis): number {
  const { auraScore, density, handedness } = analysis;
  const top = Math.round(density.top * 10000);
  const mid = Math.round(density.middle * 10000);
  const bot = Math.round(density.bottom * 10000);
  const handBit = handedness === "Right" ? 1 : 0;

  // FNV-1a-style 32-bit mix.
  let h = 2166136261 >>> 0;
  for (const v of [auraScore, top, mid, bot, handBit]) {
    h ^= v >>> 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateReading(analysis: PalmAnalysis): Reading {
  const seed = seedFromAnalysis(analysis);
  const rng = mulberry32(seed);
  // Order matters for determinism — fixed sequence of pulls.
  return {
    intro: pick(readingsData.intro, rng),
    love: pick(readingsData.love, rng),
    career: pick(readingsData.career, rng),
    health: pick(readingsData.health, rng),
    conclusion: pick(readingsData.conclusion, rng),
  };
}
