"use client";

import type { CSSProperties } from "react";

/**
 * The theory — plain words, then honest pros-and-cons, then a
 * side-by-side comparison table, then a one-line summary.
 *
 * Answers the real questions a non-technical judge asks, without jargon
 * walls, while keeping every claim the project already stands behind.
 */

interface MemCard {
  name: string;
  emoji: string;
  accent: "amber" | "cyan";
  what: string;
  how: string;
  advantages: string[];
  disadvantages: string[];
}

const CARDS: MemCard[] = [
  {
    name: "The conventional LLM",
    emoji: "📚",
    accent: "amber",
    what:
      "It keeps every single word it reads. Nothing is thrown away, nothing is squeezed down. Ask it about something from ten minutes ago and it can go back and find the exact words.",
    how:
      "Every new token is added to a long growing list (the KV-cache). The more it has read, the bigger the list — and the bigger the bill.",
    advantages: [
      "Remembers everything exactly — nothing you said is lost.",
      "Can pull precise details back from anywhere in the conversation.",
      "It is the engine behind most AI you already use — proven, familiar.",
    ],
    disadvantages: [
      "Memory grows with every word, so long inputs get expensive.",
      "The bigger the memory, the more processing it needs (attention over everything).",
    ],
  },
  {
    name: "The BDH-CQ-inspired trace",
    emoji: "💠",
    accent: "cyan",
    what:
      "It keeps ONE small summary — in this demo a fixed 48-byte state — and rewrites that same summary as it reads. It cannot go back to exact words; it only has what its little note captured.",
    how:
      "At every token it runs one update through a fixed-size state and passes the state forward. The summary changes, but the space it occupies never gets bigger.",
    advantages: [
      "Same small memory no matter how long the input — 48 bytes at 10 words or 10 million.",
      "Cheap to keep and cheap to update — the cost does not grow with the text.",
      "Streams: it can start producing while still reading.",
    ],
    disadvantages: [
      "It cannot quote exact words back — it only has what its note captured.",
      "If something did not fit in the summary, it is gone.",
    ],
  },
];

const ACCENT = {
  amber: {
    border: "border-amber-500/25",
    bg: "bg-amber-500/[0.05]",
    title: "text-amber-300",
    chipGood: "border-emerald-500/30 bg-emerald-500/8 text-emerald-300",
    chipBad: "border-rose-500/30 bg-rose-500/8 text-rose-300",
    glow: "glow-amber",
    glowVar: "245,158,60",
    rowHead: "text-amber-300",
    row: "border-amber-500/15 bg-amber-500/[0.04]",
  },
  cyan: {
    border: "border-cyan-500/25",
    bg: "bg-cyan-500/[0.05]",
    title: "text-cyan-300",
    chipGood: "border-emerald-500/30 bg-emerald-500/8 text-emerald-300",
    chipBad: "border-rose-500/30 bg-rose-500/8 text-rose-300",
    glow: "glow-cyan",
    glowVar: "45,212,191",
    rowHead: "text-cyan-300",
    row: "border-cyan-500/15 bg-cyan-500/[0.04]",
  },
};

const COMPARE_ROWS = [
  {
    label: "What it keeps",
    conventional:
      "Every single word it reads — stored in a growing list.",
    latent:
      "One small summary — rewritten at every step, never bigger.",
  },
  {
    label: "How it stores it",
    conventional:
      "A KV-cache that grows with the context, token by token.",
    latent:
      "A fixed-size state vector it updates and passes forward.",
  },
  {
    label: "Memory as text grows",
    conventional:
      "Grows — more words means more memory and more compute.",
    latent:
      "Stays the same — 48 bytes whether the input is 10 or 10,000,000.",
  },
  {
    label: "Can it quote back exactly?",
    conventional: "Yes — it still has the exact words.",
    latent: "No — only what its summary captured.",
  },
  {
    label: "Memory cost model",
    conventional: "O(n) — grows with context length.",
    latent: "O(1) — fixed no matter the length.",
  },
];

export default function TheoryComparison() {
  return (
    <section
      id="sec-theory"
      className="mt-10 animate-fade-in"
      aria-label="The theory in plain words"
    >
      {/* ── Definition ── */}
      <div className="mb-1 flex items-center gap-3">
        <h2 className="font-display text-xl italic text-paper">
          The theory, in plain words
        </h2>
        <span className="h-px flex-1 bg-gradient-to-r from-graphite-600 to-transparent" />
      </div>
      <p className="mb-6 text-sm leading-relaxed text-paper/55">
        Two designs for keeping a conversation in mind. One remembers
        everything you type by growing a long list as it reads. The other
        keeps one small summary that it rewrites as it goes, the same size
        whether you said ten words or ten million. Everything below is the
        same idea you just watched run above — no new claims.
      </p>

      {/* ── What each keeps, and what is good / not-so-good about it ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CARDS.map((c) => {
          const a = ACCENT[c.accent];
          return (
            <div
              key={c.name}
              className={`glow-card rounded-xl border ${a.border} ${a.bg} p-5 shadow-lg ${a.glow}`}
              style={{ "--glow": a.glowVar } as CSSProperties}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">{c.emoji}</span>
                <h3 className={`font-display text-base italic ${a.title}`}>
                  {c.name}
                </h3>
              </div>

              <div className="mb-4 space-y-2.5 text-[12.5px] leading-relaxed text-paper/60">
                <p>
                  <span className="font-semibold text-paper/75">
                    What it keeps —
                  </span>{" "}
                  {c.what}
                </p>
                <p>
                  <span className="font-semibold text-paper/75">
                    How it keeps it —
                  </span>{" "}
                  {c.how}
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-graphite-950/50 p-3">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70">
                    Advantages
                  </div>
                  <ul className="space-y-1.5">
                    {c.advantages.map((g) => (
                      <li
                        key={g}
                        className="flex gap-1.5 text-[11.5px] leading-relaxed text-paper/65"
                      >
                        <span className="mt-px text-emerald-400">+</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-graphite-950/50 p-3">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300/70">
                    Disadvantages
                  </div>
                  <ul className="space-y-1.5">
                    {c.disadvantages.map((b) => (
                      <li
                        key={b}
                        className="flex gap-1.5 text-[11.5px] leading-relaxed text-paper/65"
                      >
                        <span className="mt-px text-rose-400">-</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Side-by-side comparison table ── */}
      <div className="mt-6">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/45">
          Side-by-side comparison
        </h3>

        <div className="overflow-hidden rounded-xl border border-graphite-600 bg-graphite-900/60">
          <div className="grid grid-cols-1 border-b border-graphite-700/80 divide-x divide-graphite-700/80">
            <div className="p-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/40">
                Attribute
              </span>
            </div>
            <div className="p-3">
              <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${ACCENT.amber.rowHead}`}>
                Conventional LLM
              </span>
            </div>
            <div className="p-3">
              <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${ACCENT.cyan.rowHead}`}>
                BDH-CQ-inspired trace
              </span>
            </div>
          </div>

          <div className="divide-y divide-graphite-700/60">
            {COMPARE_ROWS.map((r) => (
              <div
                key={r.label}
                className="grid grid-cols-1 border-b border-graphite-700/60 last:border-b-0 p-3"
              >
                <div className="text-[11px] font-medium text-paper/55">
                  {r.label}
                </div>
                <div
                  className={`text-[11.5px] leading-relaxed ${ACCENT.amber.row}`}
                >
                  {r.conventional}
                </div>
                <div
                  className={`text-[11.5px] leading-relaxed ${ACCENT.cyan.row}`}
                >
                  {r.latent}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── One-line summary ── */}
      <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-6 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/70">
          The whole difference in one line
        </div>
        <p className="mt-2 font-display text-lg italic leading-snug text-paper/90">
          One side remembers{" "}
          <span className="text-amber-300">everything, and pays more for
          every word</span>. The other keeps{" "}
          <span className="text-cyan-300">one small summary that never
          grows</span>. Same question, same meaning — different memory,
          different cost.
        </p>
      </div>
    </section>
  );
}
