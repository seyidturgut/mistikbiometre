"use client";

import { forwardRef } from "react";
import { Sparkles, Hand, Music, Eye } from "lucide-react";
import type {
  FaceResult,
  IrisResult,
  PalmResult,
  VoiceResult,
} from "@/lib/store";

interface Props {
  palm: PalmResult | null;
  face: FaceResult | null;
  iris: IrisResult | null;
  voice: VoiceResult | null;
}

export const MysticID = forwardRef<HTMLDivElement, Props>(function MysticID(
  { palm, face, iris, voice },
  ref,
) {
  const auraColor = voice?.chakraColor ?? "#a574ff";
  const archetype = face?.archetype ?? "Yıldız Çocuğu";
  const idCode = generateCode(palm, face, voice);

  return (
    <div
      ref={ref}
      className="relative w-full max-w-md mx-auto rounded-[28px] overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 0% 0%, ${auraColor}33, transparent 50%),
          radial-gradient(ellipse at 100% 100%, ${auraColor}22, transparent 55%),
          linear-gradient(160deg, #1a0d2e 0%, #07060c 60%, #0d0719 100%)
        `,
        boxShadow: `
          0 0 0 1px ${auraColor}55,
          0 0 60px ${auraColor}44,
          inset 0 0 60px rgba(255,255,255,0.03)
        `,
      }}
    >
      {/* Holographic shimmer corner */}
      <div
        className="absolute top-0 right-0 w-40 h-40 opacity-30 mix-blend-screen pointer-events-none"
        style={{
          background:
            "conic-gradient(from 90deg at 100% 0%, #4af0d4, #a574ff, #f5c542, #ff6fa5, #4af0d4)",
          filter: "blur(20px)",
        }}
      />

      {/* Header */}
      <div className="relative p-6 pb-4 flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan/80">
            Mystic Biometric ID
          </p>
          <p className="font-mono text-[11px] text-text-dim mt-0.5">
            #{idCode}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: `${auraColor}22`,
            boxShadow: `0 0 16px ${auraColor}88`,
          }}
        >
          <Sparkles
            className="w-4 h-4"
            style={{ color: auraColor, filter: `drop-shadow(0 0 4px ${auraColor})` }}
          />
        </div>
      </div>

      {/* Hero — archetype */}
      <div className="relative px-6 mb-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-text-muted mb-1">
          Arketip
        </p>
        <h2
          className="font-serif text-5xl leading-[1] italic"
          style={{
            color: auraColor,
            textShadow: `0 0 16px ${auraColor}66`,
          }}
        >
          {archetype}
        </h2>
        {face?.archetypeDescription && (
          <p className="text-xs text-text/85 mt-3 leading-relaxed font-serif">
            {face.archetypeDescription}
          </p>
        )}
      </div>

      {/* Aura spiral — abstract mandala derived from aura score */}
      {palm && (
        <div className="relative mx-6 mb-4 rounded-2xl overflow-hidden ring-1 ring-white/10 aspect-[2/1] bg-black/50 flex items-center justify-center">
          <AuraSpiral
            score={palm.analysis.auraScore}
            color={voice?.chakraColor ?? "#4af0d4"}
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[9px] font-mono tracking-wider text-neon-cyan ring-1 ring-neon-cyan/40">
            Aura Spiral
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] font-mono text-neon-gold">
            Aura {palm.analysis.auraScore}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="relative px-6 pb-4 grid grid-cols-2 gap-2">
        <Stat
          icon={<Music className="w-3.5 h-3.5" />}
          label="Aktif Çakra"
          value={voice?.chakra ?? "—"}
          color={voice?.chakraColor ?? "#f5c542"}
        />
        <Stat
          icon={<Eye className="w-3.5 h-3.5" />}
          label="Ruhsal Yaş"
          value={iris?.soulAge ?? "—"}
          color={iris ? `rgb(${iris.dominantColor.r},${iris.dominantColor.g},${iris.dominantColor.b})` : "#a574ff"}
        />
        <Stat
          icon={<Hand className="w-3.5 h-3.5" />}
          label="El"
          value={
            palm
              ? palm.analysis.handedness === "Right"
                ? "Sağ"
                : "Sol"
              : "—"
          }
          color="#4af0d4"
        />
      </div>

      {/* Footer */}
      <div className="relative px-6 pb-6 pt-3 border-t border-white/5 flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-text-dim">
            Element
          </p>
          <p className="text-xs font-serif italic text-text/90">
            {iris?.element ?? "Ether"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.3em] text-text-dim">
            Issued
          </p>
          <p className="text-xs font-mono text-text/80">
            {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
      </div>

      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 3px)",
        }}
      />
    </div>
  );
});

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow: `inset 0 0 0 1px ${color}25`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
        {icon}
        <p className="text-[9px] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xs font-medium leading-tight">{value}</p>
    </div>
  );
}

/**
 * Score-driven mystical mandala. Layers:
 *  - outer dashed ring with tick marks
 *  - rosette of N petals (count derived from auraScore)
 *  - inner pentagram of overlapping triangles
 *  - center dot
 */
function AuraSpiral({ score, color }: { score: number; color: string }) {
  const petals = Math.max(7, Math.min(24, 7 + Math.round(score / 6)));
  const cx = 100;
  const cy = 50;
  const outerR = 38;
  const petalR = 28;

  // Pre-compute petal positions
  const petalNodes = Array.from({ length: petals }, (_, i) => {
    const a = (i / petals) * Math.PI * 2;
    return { x: cx + Math.cos(a) * petalR, y: cy + Math.sin(a) * petalR };
  });

  // Inner pentagon points (5-fold rosette)
  const pentagram = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * 16, cy + Math.sin(a) * 16].join(",");
  }).join(" ");

  // Tick marks around the outer ring
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (outerR + 1);
    const y1 = cy + Math.sin(a) * (outerR + 1);
    const len = i % 9 === 0 ? 3 : 1.4;
    const x2 = cx + Math.cos(a) * (outerR + 1 + len);
    const y2 = cy + Math.sin(a) * (outerR + 1 + len);
    return { x1, y1, x2, y2 };
  });

  return (
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <defs>
        <radialGradient id="aura-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="60%" stopColor={color} stopOpacity="0.05" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* glow */}
      <rect x="0" y="0" width="200" height="100" fill="url(#aura-glow)" />

      {/* outer dashed ring */}
      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        fill="none"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth="0.4"
        strokeDasharray="1.5 1.5"
      />

      {/* tick marks */}
      <g stroke={color} strokeOpacity="0.55" strokeWidth="0.4">
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        ))}
      </g>

      {/* petal circles */}
      <g stroke={color} strokeOpacity="0.75" strokeWidth="0.4" fill="none">
        {petalNodes.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="6" />
        ))}
      </g>

      {/* connecting chords for first/half petals */}
      <g stroke={color} strokeOpacity="0.3" strokeWidth="0.25">
        {petalNodes.map((p, i) => {
          const next = petalNodes[(i + Math.floor(petals / 3)) % petals];
          return (
            <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y} />
          );
        })}
      </g>

      {/* inner pentagram (rosette) */}
      <g
        stroke={color}
        strokeOpacity="0.6"
        strokeWidth="0.5"
        fill="none"
      >
        <polygon points={pentagram} />
        <polygon
          points={pentagram}
          transform={`rotate(36 ${cx} ${cy})`}
          opacity="0.55"
        />
      </g>

      {/* score arc */}
      <circle
        cx={cx}
        cy={cy}
        r={outerR - 3}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * 2 * Math.PI * (outerR - 3)} 999`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 1.5px ${color})` }}
      />

      {/* center dot */}
      <circle
        cx={cx}
        cy={cy}
        r="2.4"
        fill={color}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  );
}

function generateCode(
  palm: PalmResult | null,
  face: FaceResult | null,
  voice: VoiceResult | null,
): string {
  const parts: string[] = [];
  parts.push(palm ? palm.analysis.auraScore.toString().padStart(2, "0") : "00");
  parts.push(
    face
      ? Math.round(face.ratios.forehead * 100)
          .toString()
          .padStart(2, "0")
      : "00",
  );
  parts.push(
    voice ? Math.round(voice.avgFrequency).toString().slice(0, 3) : "000",
  );
  return parts.join("-");
}
