"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Hand, Scan, Mic, ArrowRight, Check } from "lucide-react";
import { useMysticStore } from "@/lib/store";

const modules = [
  {
    key: "palm",
    href: "/scan/palm",
    title: "El Falı",
    sub: "Chiromancy",
    description: "Avucundaki çizgilerden aşk, kariyer ve sağlık okuması.",
    icon: Hand,
    accent: "#4af0d4",
  },
  {
    key: "face",
    href: "/scan/face-iris",
    title: "Yüz & İris",
    sub: "Physiognomy",
    description: "Yüz oranlarından arketipin, gözlerinden ruhsal yaşın.",
    icon: Scan,
    accent: "#a574ff",
  },
  {
    key: "voice",
    href: "/scan/voice",
    title: "Ses & Çakra",
    sub: "Vocal Aura",
    description: "Sesinin frekansından aktif çakran.",
    icon: Mic,
    accent: "#f5c542",
  },
] as const;

export default function HomePage() {
  const { palm, face, iris, voice } = useMysticStore();
  const completed = {
    palm: !!palm,
    face: !!face,
    voice: !!voice,
  };
  const completedCount = Object.values(completed).filter(Boolean).length;

  const tunnelHref = (() => {
    if (!palm) return "/scan/palm";
    if (!face || !iris) return "/scan/face-iris";
    if (!voice) return "/scan/voice";
    return "/result";
  })();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12 max-w-3xl"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs uppercase tracking-[0.4em] text-neon-cyan/80 mb-4"
        >
          Mystic Biometric Scanner
        </motion.p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] mb-6">
          Beden, ses ve aura.
          <br />
          <span className="italic text-glow-gold text-neon-gold">
            Tek bir kimlikte.
          </span>
        </h1>
        <p className="text-text-muted max-w-xl mx-auto leading-relaxed">
          Avucundan iris rengine, sesinin frekansından nefes ritmine —
          üç mistik tarayıcıyla biyometrik kimliğin tarayıcında oluşur.
          Hiçbir veri sunucuya gitmez.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mb-12 flex flex-col items-center"
      >
        <Link
          href={tunnelHref}
          className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-neon-cyan/20 via-neon-violet/20 to-neon-gold/20 ring-1 ring-neon-cyan/50 hover:ring-neon-gold/60 transition-all"
          style={{ boxShadow: "0 0 30px rgba(74,240,212,0.25)" }}
        >
          <span className="font-serif italic text-lg">
            {completedCount === 0
              ? "İnisiyasyona Başla"
              : completedCount < 3
                ? "Devam Et"
                : "Mistik Kimliğine Bak"}
          </span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        <p className="text-center text-xs text-text-dim mt-3 tracking-wider">
          {completedCount}/3 tamamlandı
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl w-full"
      >
        {modules.map((mod) => {
          const Icon = mod.icon;
          const done = completed[mod.key as keyof typeof completed];
          return (
            <motion.div
              key={mod.key}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <Link href={mod.href} className="block h-full group">
                <div
                  className="relative card-mystic rounded-2xl p-6 h-full overflow-hidden transition-all group-hover:-translate-y-1"
                  style={{
                    boxShadow: `0 0 0 1px ${mod.accent}33, 0 12px 40px -12px ${mod.accent}33`,
                  }}
                >
                  <div
                    className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20 blur-3xl group-hover:opacity-30 transition-opacity"
                    style={{ background: mod.accent }}
                  />
                  {done && (
                    <div
                      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: `${mod.accent}33`,
                        boxShadow: `0 0 12px ${mod.accent}88`,
                      }}
                    >
                      <Check
                        className="w-3.5 h-3.5"
                        style={{ color: mod.accent }}
                      />
                    </div>
                  )}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{
                      background: `${mod.accent}1a`,
                      boxShadow: `inset 0 0 20px ${mod.accent}22`,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: mod.accent }} />
                  </div>
                  <p
                    className="text-[10px] uppercase tracking-[0.3em] mb-1"
                    style={{ color: mod.accent }}
                  >
                    {mod.sub}
                  </p>
                  <h3 className="font-serif text-2xl mb-2">{mod.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 text-xs text-text-dim text-center max-w-md tracking-wider"
      >
        Tüm analiz tarayıcında çalışır · MediaPipe + OpenCV.js + Web Audio
      </motion.p>
    </main>
  );
}
