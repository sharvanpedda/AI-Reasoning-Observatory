import Link from "next/link";
import GlowCard from "@/components/GlowCard";
import TechGlowChip from "@/components/TechGlowChip";

/**
 * About page — the hackathon-facing context for the AI Memory Observatory.
 * This is where DataForge / Pathway track identity, the problem statement,
 * the honesty-first approach, and team/links live. The homepage stays a
 * general product explainer; this page is the submission-facing one.
 */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl italic text-paper md:text-3xl">{children}</h2>;
}

function Pill({
  children,
  tone = "amber",
}: {
  children: React.ReactNode;
  tone?: "amber" | "cyan" | "violet";
}) {
  const tones: Record<string, string> = {
    amber: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function StatusRow({ label, status, note }: { label: string; status: string; note: string }) {
  const statusStyle: Record<string, string> = {
    Real: "text-emerald-400 border-emerald-500/25 bg-emerald-500/8",
    Estimated: "text-paper/60 border-paper/15 bg-graphite-950/40",
    "Not exposed": "text-paper/40 border-paper/10 bg-graphite-950/30",
    Labeled: "text-cyan-300 border-cyan-500/25 bg-cyan-500/8",
  };
  return (
    <div className="flex flex-col gap-1.5 border-b border-graphite-700/60 py-3 last:border-none sm:flex-row sm:items-start sm:gap-4">
      <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
        <span
          className={`readout shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
            statusStyle[status] ?? statusStyle.Estimated
          }`}
        >
          {status}
        </span>
        <span className="text-[13px] font-medium text-paper/85">{label}</span>
      </div>
      <p className="text-[13px] leading-relaxed text-paper/55">{note}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      {/* ── Hero ── */}
      <header className="mb-12 animate-slide-up">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Pill tone="amber">DataForge 2026</Pill>
          <Pill tone="cyan">Problem Statement 1 · Pathway Track</Pill>
        </div>
        <h1 className="font-display text-3xl italic leading-tight text-paper md:text-5xl">
          About this project
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/60">
          The AI Reasoning Observatory is our submission for DataForge&apos;s Pathway track. It
          takes Pathway&apos;s BDH / BDH-CQ idea — a{" "}
          <strong className="text-amber-300">fixed-size recurrent latent state</strong> instead of
          a context window that grows with every token — and makes it something a judge can watch
          happen, live, next to a real LLM answering the same question.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/observatory"
            className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-graphite-950 shadow-[0_8px_32px_-8px_rgba(245,158,60,0.5)] transition-all hover:bg-amber-400 hover:shadow-[0_8px_40px_-6px_rgba(245,158,60,0.65)]"
          >
            Open the Observatory →
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-graphite-600 bg-graphite-900/50 px-6 py-3 text-sm font-medium text-paper/70 transition-all hover:border-paper/25 hover:text-paper"
          >
            ← Back to overview
          </Link>
        </div>
      </header>

      {/* ── The challenge ── */}
      <section className="mb-12">
        <SectionTitle>The problem statement</SectionTitle>
        <GlowCard accent="45,212,191" className="mt-3 max-w-3xl p-5">
          <p className="text-sm leading-relaxed text-paper/55">
            Pathway&apos;s BDH / BDH-CQ line of work argues that reasoning doesn&apos;t require an
            ever-growing context window — a fixed-size latent state, updated recurrently, can
            carry what matters. That idea is easy to state and hard to <em>see</em>. Problem
            Statement 1 asked for something that makes it visible and checkable rather than
            another slide with a diagram and a citation.
          </p>
        </GlowCard>
      </section>

      {/* ── Our approach ── */}
      <section className="mb-12">
        <SectionTitle>Our approach</SectionTitle>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-paper/55">
          A judge types a real question. It runs through a live LLM call and a transparent,
          deterministic BDH-CQ-style state update at the same time, on a shared timeline. Nothing
          is scripted or pre-recorded — and nowhere does the UI invent a number it doesn&apos;t
          actually have. That constraint shaped every product decision here, so we made it explicit
          rather than leaving it implied:
        </p>
        <div className="mt-5">
          <GlowCard accent="34,197,94" className="mb-3 p-1">
          <StatusRow
            label="Conventional LLM's answer"
            status="Real"
            note="Streamed live from the model provider's API — not canned, unless Demo Mode kicks in because no API key is configured."
          />
          <StatusRow
            label="Token counts (post-inference)"
            status="Real"
            note="The provider's own reported usage numbers, not a local guess."
          />
          <StatusRow
            label="Prompt token count (pre-inference)"
            status="Estimated"
            note="A dependency-free regex tokenizer stands in until the provider's real count supersedes it — the real tokenizer isn't public."
          />
          <StatusRow
            label="KV-cache memory"
            status="Not exposed"
            note="Providers don't expose this number. Rather than invent one, the UI says so outright."
          />
          <StatusRow
            label="BDH-CQ forward pass"
            status="Labeled"
            note="A real, deterministic recurrent state update illustrating the fixed-size-state idea genuinely associated with BDH/BDH-CQ — not Pathway's official model."
          />
          <StatusRow
            label="BDH-CQ backward + combined passes"
            status="Labeled"
            note="A classical bidirectional-RNN extension (Schuster & Paliwal, 1997), included to show the idea generalizing beyond one causal direction — explicitly not part of BDH-CQ itself."
          />
          </GlowCard>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-paper/45">
          Full sourcing for every number lives in the in-app Evidence panel and in the project
          README.
        </p>
      </section>

      {/* ── Stack ── */}
      <section className="mb-12">
        <SectionTitle>Built with</SectionTitle>
        <p className="mb-4 mt-3 max-w-3xl text-sm leading-relaxed text-paper/55">
          Hover a technology to see it glow — <strong className="text-paper/80">click it</strong>{" "}
          to see exactly how this project uses it.
        </p>
        <TechGlowChip />
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-paper/55">
          Frontend and backend are two independently deployable services with no shared process —
          the frontend never sees the provider API key. See the README for the full architecture
          and the security rationale.
        </p>
      </section>

      {/* ── Team ── */}
      <section className="mb-12">
        <SectionTitle>Team</SectionTitle>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-paper/55">
          Built by <strong className="text-paper/80">Team PixelPerfect</strong> for DataForge 2026
          at IIT Kharagpur.
        </p>
      </section>

      {/* ── Links ── */}
      <section>
        <SectionTitle>Links</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg border border-graphite-600 bg-graphite-900/60 px-3 py-1.5 text-paper/50">
            GitHub repo — add your link
          </span>
        </div>
      </section>
    </main>
  );
}
