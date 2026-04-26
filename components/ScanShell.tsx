"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  step: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ScanShell({ step, title, subtitle, children }: Props) {
  return (
    <main className="flex-1 flex flex-col px-4 py-6 md:py-10">
      <div className="max-w-5xl w-full mx-auto mb-6 md:mb-10 flex items-start justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Geri</span>
        </Link>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan/80 mb-1">
            {step}
          </p>
          <h1 className="font-serif text-2xl md:text-3xl leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-text-muted mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex-1 flex items-center">
        <div className="w-full">{children}</div>
      </div>
    </main>
  );
}
