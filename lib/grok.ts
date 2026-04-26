"use client";

import type { PalmAnalysis, Reading } from "./types";
import type { FaceResult, VoiceResult } from "./store";

interface GrokResponse<T> {
  content?: T;
  error?: string;
}

async function callGrok<T>(
  kind: "palm" | "face" | "voice",
  data: unknown,
): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch("/api/grok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const json = (await res.json()) as GrokResponse<T>;
    return json.content ?? null;
  } catch {
    return null;
  }
}

function isReading(v: unknown): v is Reading {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.intro === "string" &&
    typeof r.love === "string" &&
    typeof r.career === "string" &&
    typeof r.health === "string" &&
    typeof r.conclusion === "string"
  );
}

export async function generateReadingFromGrok(
  analysis: PalmAnalysis,
): Promise<Reading | null> {
  const result = await callGrok<unknown>("palm", {
    auraScore: analysis.auraScore,
    handedness: analysis.handedness,
    density: analysis.density,
    levels: analysis.levels,
  });
  return isReading(result) ? result : null;
}

interface GrokFacePayload {
  archetype: string;
  archetypeDescription: string;
  traits: { intellect: string; willpower: string; perception: string };
}

function isFacePayload(v: unknown): v is GrokFacePayload {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  const traits = r.traits as Record<string, unknown> | undefined;
  return (
    typeof r.archetype === "string" &&
    typeof r.archetypeDescription === "string" &&
    !!traits &&
    typeof traits.intellect === "string" &&
    typeof traits.willpower === "string" &&
    typeof traits.perception === "string"
  );
}

export async function enhanceFaceWithGrok(
  face: FaceResult,
): Promise<FaceResult> {
  const result = await callGrok<unknown>("face", {
    ratios: face.ratios,
    levels: face.levels,
  });
  if (!isFacePayload(result)) return face;
  return {
    ...face,
    archetype: result.archetype,
    archetypeDescription: result.archetypeDescription,
    traits: result.traits,
  };
}

interface GrokVoicePayload {
  chakra: string;
  chakraColor: string;
  vocalAura: string;
}

function isVoicePayload(v: unknown): v is GrokVoicePayload {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.chakra === "string" &&
    typeof r.chakraColor === "string" &&
    typeof r.vocalAura === "string"
  );
}

export async function enhanceVoiceWithGrok(
  voice: VoiceResult,
): Promise<VoiceResult> {
  const result = await callGrok<unknown>("voice", {
    avgFrequency: voice.avgFrequency,
    amplitudeStability: voice.amplitudeStability,
    band: voice.band,
  });
  if (!isVoicePayload(result)) return voice;
  return {
    ...voice,
    chakra: result.chakra,
    chakraColor: result.chakraColor,
    vocalAura: result.vocalAura,
  };
}
