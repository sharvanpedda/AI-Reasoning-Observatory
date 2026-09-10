import type { CSSProperties } from "react";

const LABELS = [
  {
    label: "LIVE",
    color: "text-amber-400",
    border: "border-amber-500/25",
    bg: "bg-amber-500/5",
    dot: "bg-amber-400",
    desc: "Collected from this execution — e.g. provider-reported input/output token counts, measured end-to-end latency.",
  },
  {
    label: "ESTIMATED / PROXY",
    color: "text-paper/65",
    border: "border-paper/15",
    bg: "bg-paper/3",
    dot: "bg-paper/40",
    desc: "An explicitly-defined approximation used only when an exact live measurement isn't available (e.g. pre-call token count from a proxy tokenizer).",
  },
  {
    label: "UNAVAILABLE",
    color: "text-paper/35",
    border: "border-paper/10",
    bg: "bg-graphite-950/40",
    dot: "bg-paper/20",
    desc: "The provider or runtime does not expose this metric. We say so explicitly rather than inventing a number (FR-20).",
  },
  {
    label: "PUBLISHED",
    color: "text-cyan-300",
    border: "border-cyan-500/25",
    bg: "bg-cyan-500/5",
    dot: "bg-cyan-400",
    desc: "Reported by a cited research source, not measured by this application.",
  },
];

const SOURCES = [
  {
    title: "BDH-CQ: In-Context Learning with Recurrent Latent Reasoning (arXiv:2608.09888)",
    detail:
      "The primary Pathway paper this project references. A 150M-parameter model that updates a persistent recurrent memory from in-context demonstrations, then reasons through a query via iterative computation in a continuous latent space — without a text chain-of-thought.",
    url: "https://arxiv.org/abs/2608.09888",
    tag: "primary source",
  },
  {
    title: "Introducing BDH-CQ — Pathway Research Blog",
    detail:
      "Pathway's own announcement of the ARC-AGI-1 result and the framing of persistent latent state versus a growing context window.",
    url: "https://pathway.com/research/introducing-bdh-cq",
    tag: "pathway official",
  },
  {
    title: "lucidrains/bdh-cq — Community Reimplementation",
    detail:
      "A public, unofficial reimplementation referenced when investigating whether a runnable BDH-CQ could be embedded directly in this hackathon build (FR-27).",
    url: "https://github.com/lucidrains/bdh-cq",
    tag: "open source",
  },
  {
    title: "Schuster & Paliwal (1997) — Bidirectional Recurrent Neural Networks",
    detail:
      "Classical source for the backward-pass and combined-state technique shown in the BDH-CQ panel. This is a general recurrent-network idea — NOT part of Pathway's published BDH-CQ architecture, which processes context causally. Included to illustrate how a fixed-size state generalizes beyond one direction.",
    url: "https://ieeexplore.ieee.org/document/650093",
    tag: "classical paper",
  },
];

export default function EvidencePanel() {
  return (
    <div
      className="glow-card rounded-xl border border-graphite-600 bg-graphite-900/70 p-5"
      style={{ "--glow": "139,92,246" } as CSSProperties}
    >
      <div className="mb-4 flex items-center gap-3">
        <h3 className="font-display text-lg italic text-paper/90">
          Evidence &amp; Scientific Integrity
        </h3>
        <span className="rounded-full border border-graphite-600 bg-graphite-950/60 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-paper/30">
          SRS Section 12
        </span>
      </div>

      {/* Metric label legend */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LABELS.map((l) => (
          <div
            key={l.label}
            className={`rounded-xl border ${l.border} ${l.bg} p-3`}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${l.dot}`} />
              <span className={`readout text-[11px] font-medium ${l.color}`}>{l.label}</span>
            </div>
            <div className="text-[11px] leading-relaxed text-paper/45">{l.desc}</div>
          </div>
        ))}
      </div>

      {/* Core integrity statement */}
      <div className="mb-4 rounded-xl border border-graphite-600 bg-graphite-950/60 p-3.5 text-[11px] leading-relaxed text-paper/50">
        This build does <strong className="text-paper/75">not</strong> run Pathway's official BDH-CQ model —
        no lightweight, reliably runnable public checkpoint was available within the hackathon window.
        The BDH-CQ panel is a transparent, deterministic algorithmic demonstration of one architectural
        idea (a fixed-size recurrent state vs. a growing context window), not a reproduction of
        Pathway's measured results. Attention complexity, KV-cache memory, and reasoning-step count
        are three different things and are never collapsed into a single number here.
      </div>

      {/* Bidirectional distinction */}
      <div className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-[11px] leading-relaxed text-paper/55">
        <span className="readout text-cyan-300">Forward vs. bidirectional, specifically: </span>
        the BDH-CQ panel's <em>forward</em> pass illustrates the persistent-state idea genuinely
        associated with Pathway's BDH/BDH-CQ line of work. Its <em>backward</em> and{" "}
        <em>combined</em> passes are a separate, classical bidirectional-RNN technique (Schuster
        &amp; Paliwal, 1997, cited below) included to show how a fixed-size state generalizes
        beyond one direction. Pathway's published BDH-CQ is described as processing context
        causally — the bidirectional passes are{" "}
        <strong className="text-paper/80">not</strong> part of BDH-CQ and are labeled
        separately at all times.
      </div>

      {/* Sources */}
      <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-paper/40">
        Cited Sources
      </h4>
      <ul className="space-y-3">
        {SOURCES.map((s) => (
          <li key={s.url} className="flex gap-3">
            <span className="mt-0.5 h-fit rounded-full border border-graphite-600 bg-graphite-950/60 px-2 py-0.5 text-[9px] uppercase tracking-wide text-paper/30 whitespace-nowrap">
              {s.tag}
            </span>
            <div>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-paper/75 underline decoration-graphite-600 underline-offset-2 hover:text-amber-300 transition-colors"
              >
                {s.title}
              </a>
              <p className="mt-0.5 text-[11px] leading-relaxed text-paper/40">{s.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
