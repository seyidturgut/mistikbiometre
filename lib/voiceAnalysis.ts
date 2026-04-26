import voiceData from "@/data/voice_readings.json";
import type { VoiceResult } from "./store";

export interface VoiceCapture {
  /** average dominant frequency, Hz */
  avgFrequency: number;
  /** standard deviation of amplitude */
  amplitudeStability: number; // 0..1, 1 = very stable
  /** raw frequency samples for visualization replay */
  freqSamples: number[];
  /** raw amplitude samples 0..1 */
  ampSamples: number[];
}

function freqBand(hz: number): keyof Omit<typeof voiceData, "stability"> {
  if (hz < 110) return "low";
  if (hz < 160) return "low_mid";
  if (hz < 220) return "mid";
  if (hz < 290) return "mid_high";
  if (hz < 380) return "high";
  return "very_high";
}

function stabilityBand(s: number): "low" | "medium" | "high" {
  if (s > 0.75) return "high";
  if (s > 0.5) return "medium";
  return "low";
}

export function buildVoiceResult(capture: VoiceCapture): VoiceResult {
  const band = freqBand(capture.avgFrequency);
  const data = voiceData[band];
  const sBand = stabilityBand(capture.amplitudeStability);
  const description = `${data.description}\n\n${voiceData.stability[sBand]}`;

  // Map narrow band string to a generic 3-tier band for the store
  const broadBand: "low" | "mid" | "high" =
    band === "low" || band === "low_mid"
      ? "low"
      : band === "mid" || band === "mid_high"
        ? "mid"
        : "high";

  return {
    avgFrequency: capture.avgFrequency,
    amplitudeStability: capture.amplitudeStability,
    band: broadBand,
    chakra: data.chakra,
    chakraColor: data.chakraColor,
    vocalAura: `${data.vocalAura} — ${description}`,
  };
}
