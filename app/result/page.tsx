"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  RotateCcw,
  Heart,
  Briefcase,
  Leaf,
  Sparkles,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useMysticStore } from "@/lib/store";
import { MysticID } from "@/components/MysticID";

export default function ResultPage() {
  const { palm, face, iris, voice, reset } = useMysticStore();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [openCard, setOpenCard] = useState<string | null>("love");

  const completedCount = [palm, face, voice].filter(Boolean).length;

  if (completedCount < 1) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="card-mystic rounded-2xl p-10 text-center max-w-md">
          <p className="text-text-muted mb-5">
            Henüz hiçbir tarama tamamlamamışsın. İnisiyasyona başla.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neon-cyan/15 ring-1 ring-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/25 text-sm tracking-wide"
          >
            Başla
          </Link>
        </div>
      </main>
    );
  }

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#07060c",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `mystic-id-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
      alert("Kart indirilemedi. Tekrar dene.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    reset();
  };

  const palmCards = palm
    ? [
        {
          key: "love",
          title: "Aşk & İlişkiler",
          icon: Heart,
          accent: "#ff6fa5",
          text: palm.reading.love,
        },
        {
          key: "career",
          title: "Kariyer & Para",
          icon: Briefcase,
          accent: "#f5c542",
          text: palm.reading.career,
        },
        {
          key: "health",
          title: "Sağlık & Enerji",
          icon: Leaf,
          accent: "#4af0d4",
          text: palm.reading.health,
        },
        {
          key: "conclusion",
          title: "Mistik Sonuç",
          icon: Sparkles,
          accent: "#a574ff",
          text: palm.reading.conclusion,
        },
      ]
    : [];

  return (
    <main className="flex-1 flex flex-col px-4 py-8 md:py-12">
      <div className="max-w-5xl w-full mx-auto mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana sayfa</span>
        </Link>
        <p className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan/80">
          {completedCount}/3 modül · Mystic ID
        </p>
      </div>

      <div className="max-w-5xl w-full mx-auto grid lg:grid-cols-[minmax(0,440px)_1fr] gap-8 lg:gap-12">
        {/* Card column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <MysticID
            ref={cardRef}
            palm={palm}
            face={face}
            iris={iris}
            voice={voice}
          />

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neon-gold/15 ring-1 ring-neon-gold/50 text-neon-gold hover:bg-neon-gold/25 disabled:opacity-50 transition-colors text-sm tracking-wide"
              style={{ boxShadow: "0 0 20px rgba(245,197,66,0.25)" }}
            >
              <Download className="w-4 h-4" />
              {exporting ? "Hazırlanıyor…" : "Mystic ID'yi İndir"}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full ring-1 ring-white/10 hover:ring-white/30 hover:bg-white/5 text-sm tracking-wide transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Sıfırla
            </button>
          </div>
        </motion.div>

        {/* Detail column — palm accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan/80 mb-2">
            Detaylar
          </p>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-6">
            Avucunun{" "}
            <span className="italic text-glow-gold text-neon-gold">
              fısıltıları
            </span>
          </h2>

          {palmCards.length === 0 ? (
            <div className="card-mystic rounded-2xl p-6 text-center">
              <p className="text-text-muted text-sm mb-4">
                El falı tamamlanmamış. Detaylı okuma için palm taramasını yap.
              </p>
              <Link
                href="/scan/palm"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/15 ring-1 ring-neon-cyan/40 text-neon-cyan text-sm"
              >
                El Falına Geç
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {palmCards.map(({ key, title, icon: Icon, accent, text }) => {
                const isOpen = openCard === key;
                return (
                  <div key={key} className="card-mystic rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setOpenCard(isOpen ? null : key)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{
                          background: `${accent}1a`,
                          boxShadow: `0 0 16px ${accent}33`,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: accent }} />
                      </div>
                      <span className="flex-1 text-sm font-medium tracking-wide">
                        {title}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      </motion.div>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <div
                          className="h-px w-full mb-3"
                          style={{
                            background: `linear-gradient(90deg, ${accent}66, transparent)`,
                          }}
                        />
                        <p className="font-serif text-base leading-relaxed text-text/95">
                          {text}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Missing modules nudges */}
          <div className="mt-6 flex flex-wrap gap-2">
            {!palm && <MissingChip href="/scan/palm" label="El Falı" />}
            {!face && <MissingChip href="/scan/face-iris" label="Yüz" />}
            {!voice && <MissingChip href="/scan/voice" label="Ses" />}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function MissingChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 ring-white/10 text-xs text-text-muted hover:text-text hover:ring-white/30 transition-colors"
    >
      + {label}
    </Link>
  );
}
