import ReactMarkdown from "react-markdown";
import MetricBadge from "./MetricBadge";
import type { Metric } from "@/lib/types";

/**
 * ChatGPT/Gemini-style answer rendering (Phase 2).
 *
 * The live provider is asked to write clean Markdown; react-markdown
 * renders headings, bold, lists and inline code so the answer reads
 * like a polished assistant answer instead of a raw token dump. The
 * blinking cursor stays appended while streaming.
 */

const MD_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-1.5 mt-3 text-lg font-bold text-paper/90 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-1.5 mt-3 text-base font-bold text-paper/85 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1.5 mt-2.5 text-sm font-semibold text-paper/85 first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2.5 mt-0 leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2.5 mt-0 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2.5 mt-0 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-paper">{children}</strong>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="mb-2.5 mt-0 overflow-x-auto rounded-lg border border-graphite-700 bg-graphite-950/80 p-3 font-mono text-[12px] leading-relaxed last:mb-0">
          {children}
        </pre>
      );
    }
    return (
      <code className="rounded border border-graphite-700 bg-graphite-950/80 px-1 py-px font-mono text-[12px] text-cyan-200/90">
        {children}
      </code>
    );
  },
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-2.5 mt-0 border-l-2 border-amber-500/40 pl-3 italic text-paper/60 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-graphite-700" />,
};

export default function GeneratedOutputPanel({
  text,
  outputTokens,
  demoMode,
  active,
}: {
  text: string;
  outputTokens: Metric | null;
  demoMode: boolean;
  active: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-paper/40">Generated Output</h3>
        {outputTokens && (
          <>
            <MetricBadge label={outputTokens.label} />
            <span className="readout text-xs text-paper/50">{outputTokens.value} tok</span>
          </>
        )}
        {demoMode && (
          <span className="readout rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
            demo mode
          </span>
        )}
        {active && !demoMode && (
          <span className="readout flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            streaming
          </span>
        )}
      </div>
      <div className="panel-scroll min-h-[7rem] max-h-72 overflow-y-auto rounded-xl border border-graphite-700 bg-graphite-950/70 p-3.5 text-sm leading-relaxed text-paper/88">
        {text ? (
          <>
            <div className="markdown-answer">
              <ReactMarkdown components={MD_COMPONENTS}>{text}</ReactMarkdown>
            </div>
            {active && (
              <span className="ml-0.5 inline-block h-[1.1em] w-[3px] cursor-blink bg-amber-400 align-text-bottom" />
            )}
          </>
        ) : (
          <span className="text-paper/25 text-xs">
            Output will stream here token-by-token as the model responds…
          </span>
        )}
      </div>
    </div>
  );
}