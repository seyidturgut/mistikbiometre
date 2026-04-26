import faceData from "@/data/face_readings.json";
import irisData from "@/data/iris_readings.json";
import type { FaceResult, IrisResult } from "./store";

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe FaceLandmarker key indices (468 model)
// Reference: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
export const IDX = {
  forehead: 10, // top center forehead
  chin: 152, // bottom of chin
  leftCheek: 234, // left cheekbone outermost
  rightCheek: 454, // right cheekbone outermost
  leftJaw: 172, // left jaw angle
  rightJaw: 397, // right jaw angle
  noseBridge: 6, // between eyebrows
  // Eyes
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  // Iris (refineLandmarks: 468..477)
  leftIrisCenter: 468,
  leftIrisRight: 469,
  leftIrisTop: 470,
  leftIrisLeft: 471,
  leftIrisBottom: 472,
  rightIrisCenter: 473,
  rightIrisRight: 474,
  rightIrisTop: 475,
  rightIrisLeft: 476,
  rightIrisBottom: 477,
  // Eyelids for blink (left eye)
  leftEyeUpper: 159,
  leftEyeLower: 145,
  rightEyeUpper: 386,
  rightEyeLower: 374,
};

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function level(v: number, low: number, high: number): "low" | "medium" | "high" {
  if (v < low) return "low";
  if (v > high) return "high";
  return "medium";
}

export function analyzeFaceGeometry(
  landmarks: NormalizedLandmark[],
  capturedDataUrl: string,
  meshDataUrl?: string,
): FaceResult {
  const forehead = landmarks[IDX.forehead];
  const chin = landmarks[IDX.chin];
  const noseBridge = landmarks[IDX.noseBridge];
  const leftCheek = landmarks[IDX.leftCheek];
  const rightCheek = landmarks[IDX.rightCheek];
  const leftJaw = landmarks[IDX.leftJaw];
  const rightJaw = landmarks[IDX.rightJaw];
  const leftEyeInner = landmarks[IDX.leftEyeInner];
  const rightEyeInner = landmarks[IDX.rightEyeInner];

  const totalFaceH = dist(forehead, chin);
  const upperFaceH = dist(forehead, noseBridge);
  const cheekW = dist(leftCheek, rightCheek);
  const jawW = dist(leftJaw, rightJaw);
  const eyeSpacing = dist(leftEyeInner, rightEyeInner);

  const foreheadRatio = upperFaceH / Math.max(0.0001, totalFaceH);
  const jawRatio = jawW / Math.max(0.0001, cheekW);
  const eyeSpacingRatio = eyeSpacing / Math.max(0.0001, cheekW);

  // Empirical thresholds
  const intellect = level(foreheadRatio, 0.36, 0.44); // higher forehead = higher intellect
  const willpower = level(jawRatio, 0.78, 0.92); // wider jaw vs cheek = stronger
  const perception = level(eyeSpacingRatio, 0.27, 0.33); // wider eyes = wider perception

  const archetypeKey = `${intellect}_${willpower}_${perception}` as keyof typeof faceData.archetypes;
  const archetype =
    (faceData.archetypes as Record<string, { name: string; description: string }>)[
      archetypeKey
    ] ?? faceData.archetypes.default;

  return {
    capturedDataUrl,
    meshDataUrl,
    ratios: {
      forehead: foreheadRatio,
      jawline: jawRatio,
      eyeSpacing: eyeSpacingRatio,
    },
    levels: { intellect, willpower, perception },
    archetype: archetype.name,
    archetypeDescription: archetype.description,
    traits: {
      intellect: faceData.intellect[intellect],
      willpower: faceData.willpower[willpower],
      perception: faceData.perception[perception],
    },
  };
}

// ---- Iris analysis ----

const COLOR_PALETTE: { key: keyof typeof irisData.colors; rgb: [number, number, number] }[] = [
  { key: "blue", rgb: [70, 130, 200] },
  { key: "green", rgb: [80, 150, 110] },
  { key: "hazel", rgb: [140, 110, 70] },
  { key: "brown", rgb: [90, 60, 40] },
  { key: "gray", rgb: [130, 135, 145] },
];

function classifyColor(r: number, g: number, b: number): keyof typeof irisData.colors {
  let best = COLOR_PALETTE[0];
  let bestDist = Infinity;
  for (const c of COLOR_PALETTE) {
    const dr = r - c.rgb[0];
    const dg = g - c.rgb[1];
    const db = b - c.rgb[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.key;
}

export function analyzeIris(
  videoEl: HTMLVideoElement,
  landmarks: NormalizedLandmark[],
  blinkCount: number,
  observationSeconds: number,
): IrisResult {
  const w = videoEl.videoWidth;
  const h = videoEl.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(videoEl, 0, 0);

  // Sample around left iris center
  const lc = landmarks[IDX.leftIrisCenter];
  const lr = landmarks[IDX.leftIrisRight];
  const ll = landmarks[IDX.leftIrisLeft];
  if (!lc) {
    return fallbackIris(blinkCount, observationSeconds);
  }
  const cx = Math.round(lc.x * w);
  const cy = Math.round(lc.y * h);
  const radius = Math.max(
    3,
    Math.round((Math.abs((lr?.x ?? lc.x) - (ll?.x ?? lc.x)) * w) / 4),
  );

  const x0 = Math.max(0, cx - radius);
  const y0 = Math.max(0, cy - radius);
  const sw = Math.min(w - x0, radius * 2);
  const sh = Math.min(h - y0, radius * 2);
  const data = ctx.getImageData(x0, y0, sw, sh).data;

  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < 30 || lum > 220) continue; // ignore highlights and pupils
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (n === 0) return fallbackIris(blinkCount, observationSeconds);
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);

  const colorKey = classifyColor(r, g, b);
  const colorMeta = irisData.colors[colorKey];

  const ratePerMin = (blinkCount / Math.max(1, observationSeconds)) * 60;
  const blinkBand: "low" | "medium" | "high" =
    ratePerMin < 12 ? "low" : ratePerMin > 22 ? "high" : "medium";

  return {
    dominantColor: { r, g, b },
    colorName: colorMeta.name,
    blinkRate: ratePerMin,
    soulAge: colorMeta.soulAge,
    element: colorMeta.element,
    description: `${colorMeta.description} ${irisData.blink_rate[blinkBand]}`,
  };
}

function fallbackIris(blinkCount: number, observationSeconds: number): IrisResult {
  const colorMeta = irisData.colors.brown;
  const ratePerMin = (blinkCount / Math.max(1, observationSeconds)) * 60;
  const blinkBand: "low" | "medium" | "high" =
    ratePerMin < 12 ? "low" : ratePerMin > 22 ? "high" : "medium";
  return {
    dominantColor: { r: 90, g: 60, b: 40 },
    colorName: colorMeta.name,
    blinkRate: ratePerMin,
    soulAge: colorMeta.soulAge,
    element: colorMeta.element,
    description: `${colorMeta.description} ${irisData.blink_rate[blinkBand]}`,
  };
}

// ---- Face mesh overlay rendering ----

// Simplified face mesh connections (subset of MediaPipe FACEMESH_TESSELATION)
const MESH_EDGES: [number, number][] = [
  // Outer face oval
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
  [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
  [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
  [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
  [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
  // Eyes
  [33, 133], [133, 173], [173, 157], [157, 158], [158, 159], [159, 160],
  [160, 161], [161, 246], [246, 33],
  [263, 362], [362, 398], [398, 384], [384, 385], [385, 386], [386, 387],
  [387, 388], [388, 466], [466, 263],
  // Eyebrows
  [70, 63], [63, 105], [105, 66], [66, 107],
  [336, 296], [296, 334], [334, 293], [293, 300],
  // Nose
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 19],
  [19, 94], [94, 2],
  // Mouth
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314],
  [314, 405], [405, 321], [321, 375], [375, 291],
  [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267],
  [267, 269], [269, 270], [270, 409], [409, 291],
  // Cross-face cheekbone hints
  [234, 93], [454, 323], [127, 162], [356, 389],
];

export function drawFaceMesh(
  canvas: HTMLCanvasElement,
  videoEl: HTMLVideoElement,
  landmarks: NormalizedLandmark[],
): string {
  const w = videoEl.videoWidth;
  const h = videoEl.videoHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  // Draw edges
  ctx.strokeStyle = "#a574ff";
  ctx.lineWidth = 1.2;
  ctx.shadowColor = "#a574ff";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (const [a, b] of MESH_EDGES) {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!pa || !pb) continue;
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
  }
  ctx.stroke();

  // Dot every 8th landmark for sparkle
  ctx.fillStyle = "#4af0d4";
  ctx.shadowColor = "#4af0d4";
  ctx.shadowBlur = 4;
  for (let i = 0; i < landmarks.length; i += 8) {
    const p = landmarks[i];
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
}
