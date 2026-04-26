import type {
  Handedness,
  PalmAnalysis,
  ZoneDensity,
  DensityLevel,
} from "./types";

const NEON_CYAN = { r: 74, g: 240, b: 212 };

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function densityToLevel(d: number): DensityLevel {
  if (d < 0.04) return "low";
  if (d < 0.08) return "medium";
  return "high";
}

/**
 * Sobel edge detection in pure JS — no native deps, no OpenCV download.
 * Produces a Uint8Array where each byte is 0 (no edge) or 255 (edge).
 */
function detectEdges(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  threshold = 70,
): Uint8Array {
  // 3x3 Gaussian blur first to reduce noise
  const blurred = new Uint8ClampedArray(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      // Approx Gaussian 1 2 1 / 2 4 2 / 1 2 1, sum=16
      const v =
        (gray[i - w - 1] +
          2 * gray[i - w] +
          gray[i - w + 1] +
          2 * gray[i - 1] +
          4 * gray[i] +
          2 * gray[i + 1] +
          gray[i + w - 1] +
          2 * gray[i + w] +
          gray[i + w + 1]) >>
        4;
      blurred[i] = v;
    }
  }

  // Sobel
  const out = new Uint8Array(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -blurred[i - w - 1] -
        2 * blurred[i - 1] -
        blurred[i + w - 1] +
        blurred[i - w + 1] +
        2 * blurred[i + 1] +
        blurred[i + w + 1];
      const gy =
        -blurred[i - w - 1] -
        2 * blurred[i - w] -
        blurred[i - w + 1] +
        blurred[i + w - 1] +
        2 * blurred[i + w] +
        blurred[i + w + 1];
      const mag = Math.abs(gx) + Math.abs(gy);
      out[i] = mag > threshold ? 255 : 0;
    }
  }
  return out;
}

/**
 * No external dependencies — runs entirely on the browser's 2D canvas.
 * Replaces the previous OpenCV.js path which required a ~9MB download.
 */
export async function analyzePalm(
  capturedDataUrl: string,
  handedness: Handedness,
): Promise<PalmAnalysis> {
  const img = await loadImage(capturedDataUrl);

  // Downscale for performance.
  const targetW = Math.min(img.width, 540);
  const scale = targetW / img.width;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = w;
  srcCanvas.height = h;
  const ctx = srcCanvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Grayscale (luminance)
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
  }

  const edges = detectEdges(gray, w, h, 65);

  // Zone density (3 horizontal bands)
  const zoneH = Math.floor(h / 3);
  const counts = [0, 0, 0];
  const totals = [zoneH * w, zoneH * w, (h - 2 * zoneH) * w];

  for (let y = 0; y < h; y++) {
    const zone = y < zoneH ? 0 : y < 2 * zoneH ? 1 : 2;
    const rowStart = y * w;
    for (let x = 0; x < w; x++) {
      if (edges[rowStart + x] > 0) counts[zone]++;
    }
  }

  const density: ZoneDensity = {
    top: counts[0] / Math.max(1, totals[0]),
    middle: counts[1] / Math.max(1, totals[1]),
    bottom: counts[2] / Math.max(1, totals[2]),
  };

  const totalNonZero = counts[0] + counts[1] + counts[2];
  const totalPixels = w * h;
  const auraScore = Math.max(
    8,
    Math.min(100, Math.round((totalNonZero / totalPixels) * 750)),
  );

  // Build colorized RGBA overlay (cyan glow on transparent bg)
  const outCanvas = document.createElement("canvas");
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext("2d")!;
  const overlay = outCtx.createImageData(w, h);
  const od = overlay.data;
  for (let i = 0, j = 0; i < edges.length; i++, j += 4) {
    if (edges[i] > 0) {
      od[j] = NEON_CYAN.r;
      od[j + 1] = NEON_CYAN.g;
      od[j + 2] = NEON_CYAN.b;
      od[j + 3] = 255;
    } else {
      od[j + 3] = 0;
    }
  }
  outCtx.putImageData(overlay, 0, 0);
  const edgeMapDataUrl = outCanvas.toDataURL("image/png");

  return {
    auraScore,
    density,
    levels: {
      top: densityToLevel(density.top),
      middle: densityToLevel(density.middle),
      bottom: densityToLevel(density.bottom),
    },
    edgeMapDataUrl,
    capturedDataUrl,
    handedness,
  };
}
