"use client";

import Link from "next/link";
import GlowCard from "@/components/GlowCard";

/**
 * Homepage — professional, interactive, cursor-reactive.
 *
 * Design goals (from the team):
 *  - keep the color system (graphite/amber/cyan/violet) but lose the
 *    "explainer wall of text" feel — short, confident copy instead;
 *  - every panel glows and tilts toward the cursor (GlowCard) and a
 *    page-level spotlight follows the pointer (CursorGlow), giving the
 *    3D feel the Freebuff UI has;
 *  - the deep dives (LLM explainer, three passes, BDH-CQ background)
 *    live on /about and in the Observatory itself, not here.
 */

const STEPS = [
  {
    n: "01",
    title: "Ask",
    desc: "Type any real question. No presets required, nothing scripted.",
    accent: "245,158,60",
  },
  {
    n: "02",
    title: "Watch",
    desc: "Watch both types of memory change in real time as your question is processed.",
    accent: "45,212,191",
  },
  {
    n: "03",
    title: "Verify",
    desc: "Every number is labeled live, estimated or unavailable. Export the whole run as JSON.",
    accent: "139,92,246",
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-14 md:px-6 md:pt-20">
        {/* ── Hero ── */}
        <header className="animate-slide-up">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
              AI Memory Observatory
            </span>
            <span className="rounded-full border border-graphite-600 bg-graphite-900/60 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-paper/45">
              DataForge 2026 · IIT Kharagpur
            </span>
          </div>

          <h1 className="max-w-3xl font-display text-4xl italic leading-[1.12] text-paper md:text-6xl">
            Watch an AI{" "}
            <span className="text-amber-300">remember</span> — live.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-paper/55 md:text-lg">
            Ask one plain question — like you would a friend. The site runs it
            through two different ways of &quot;remembering&quot; side by side: one
            keeps every note and uses more memory as it goes, the other holds a
            single small summary that never takes up more space. You watch both
            happen live. Nothing is invented.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/observatory"
              className="group relative overflow-hidden rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-semibold text-graphite-950 shadow-[0_8px_32px_-8px_rgba(245,158,60,0.5)] transition-all hover:bg-amber-400 hover:shadow-[0_8px_40px_-6px_rgba(245,158,60,0.65)]"
            >
              <span className="relative">Open the Observatory →</span>
            </Link>
            <Link
              href="/about"
              className="rounded-xl border border-graphite-600 bg-graphite-900/50 px-7 py-3.5 text-sm font-medium text-paper/70 transition-all hover:border-paper/25 hover:text-paper"
            >
              How it works
            </Link>
          </div>
        </header>

        {/* ── Two kinds of memory — the core contrast ── */}
        <section className="mt-20 animate-fade-in" style={{ animationDelay: "80ms" }}>
          <div className="mb-6 flex items-center gap-3">
            <h2 className="font-display text-2xl italic text-paper md:text-3xl">
              Two kinds of memory
            </h2>
            <span className="h-px flex-1 bg-gradient-to-r from-graphite-600 to-transparent" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <GlowCard accent="245,158,60" className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                  The AI that notes everything
                </h3>
                <span className="readout rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                  keeps every note
                </span>
              </div>
              <p className="text-sm leading-relaxed text-paper/60">
                It reads every word and keeps all of it, so the more it reads,
                the more memory it needs. It can bring back anything you said —
                but it grows with the text. This is how most AI you&apos;ve used
                works today.
              </p>
              <div className="mt-4 flex items-end gap-1" aria-hidden>
                {[10, 14, 12, 18, 22, 19, 26, 30, 27, 34].map((h, i) => (
                  <span
                    key={i}
                    className="w-2.5 rounded-sm bg-gradient-to-t from-amber-600/50 to-amber-400"
                    style={{ height: `${h}px` }}
                  />
                ))}
                <span className="ml-1 text-[10px] text-amber-300/70">grows →</span>
              </div>
            </GlowCard>

            <GlowCard accent="45,212,191" className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  The tiny memory that never grows
                </h3>
                <span className="readout rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
                  same size always
                </span>
              </div>
              <p className="text-sm leading-relaxed text-paper/60">
                One small summary, rewritten as it reads, that never gets bigger
                no matter how long the text. In this demo it&apos;s just 48 bytes —
                the same size at 10 words or 10 million. You&apos;ll watch it
                update live, right next to the first one.
              </p>
              <div className="mt-4 flex items-center gap-2" aria-hidden>
                <span className="inline-block h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(79,209,201,0.8)]" />
                <span className="text-[10px] text-cyan-300/70">
                  48 bytes — at any input length
                </span>
              </div>
            </GlowCard>
          </div>
        </section>

        {/* ── How a run goes ── */}
        <section className="mt-16 animate-fade-in" style={{ animationDelay: "160ms" }}>
          <div className="mb-6 flex items-center gap-3">
            <h2 className="font-display text-2xl italic text-paper md:text-3xl">
              One prompt, two executions
            </h2>
            <span className="h-px flex-1 bg-gradient-to-r from-graphite-600 to-transparent" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <GlowCard key={s.n} accent={s.accent} className="p-6">
                <span className="readout text-[11px] text-paper/35">{s.n}</span>
                <h3 className="mt-2 font-display text-lg italic text-paper/90">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-paper/50">
                  {s.desc}
                </p>
              </GlowCard>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="mt-20 animate-fade-in"
          style={{ animationDelay: "240ms" }}
        >
          <GlowCard accent="245,158,60" tilt={false} className="p-10 text-center">
            <h2 className="font-display text-3xl italic text-paper md:text-4xl">
              See it happen in 30 seconds.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-paper/50">
              No sign-up, no setup — the Observatory runs live in your browser.
            </p>
            <Link
              href="/observatory"
              className="mt-7 inline-block rounded-xl bg-amber-500 px-9 py-3.5 text-sm font-semibold text-graphite-950 shadow-[0_8px_32px_-8px_rgba(245,158,60,0.5)] transition-all hover:bg-amber-400 hover:shadow-[0_8px_40px_-6px_rgba(245,158,60,0.65)]"
            >
              Enter the Observatory →
            </Link>
          </GlowCard>
        </section>

        <footer className="mt-16 text-center text-[11px] text-paper/25">
          Every metric labeled{" "}
          <span className="text-amber-400/60">live</span>,{" "}
          <span className="text-paper/40">estimated</span>, or{" "}
          <span className="text-cyan-400/60">published</span> — never invented.
        </footer>
      </main>
    </div>
  );
}
