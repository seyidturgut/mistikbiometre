export type Handedness = "Left" | "Right";

export type DensityLevel = "low" | "medium" | "high";

export interface ZoneDensity {
  /** Heart line region — upper third of palm */
  top: number;
  /** Head line region — middle third */
  middle: number;
  /** Life line region — lower third */
  bottom: number;
}

export interface PalmAnalysis {
  /** 0-100 mystic aura score */
  auraScore: number;
  /** Edge pixel ratio per zone (0..1) */
  density: ZoneDensity;
  /** Bucketed level per zone */
  levels: {
    top: DensityLevel;
    middle: DensityLevel;
    bottom: DensityLevel;
  };
  /** PNG data URL of the colorized neon edge map */
  edgeMapDataUrl: string;
  /** PNG data URL of the captured palm photo */
  capturedDataUrl: string;
  /** Detected handedness */
  handedness: Handedness;
}

export interface Reading {
  intro: string;
  love: string;
  career: string;
  health: string;
  conclusion: string;
}

export type AppPhase =
  | "intro"
  | "scanning"
  | "analyzing"
  | "result"
  | "error";

export interface CaptureResult {
  imageDataUrl: string;
  handedness: Handedness;
  /** Bounding box of palm in image coords (px) */
  bbox: { x: number; y: number; w: number; h: number };
}
