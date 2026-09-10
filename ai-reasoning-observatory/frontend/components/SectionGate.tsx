"use client";

import { useEffect, useRef } from "react";
import type { FlowPhase } from "@/lib/useFlowPhase";

/**
 * SectionGate — wraps each sequential section of the observatory.
 *
 * When the section's phase hasn't been reached yet, it shows a dim
 * placeholder ("waiting for previous step…"). When the phase is active
 * or past, it renders the children. It auto-scrolls into view when
 * its phase first becomes active.
 */

export default function SectionGate({
  phase,
  requiredPhase,
  sectionId,
  label,
  number,
  children,
}: {
  /** Current global flow phase */
  phase: FlowPhase;
  /** The phase at which this section becomes visible */
  requiredPhase: FlowPhase;
  /** DOM id for auto-scroll */
  sectionId: string;
  /** Human-readable label */
  label: string;
  /** Step number */
  number: number;
  /** Content to render when the gate is open */
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const isOpen = phase >= requiredPhase;

  // Auto-scroll when this section first becomes active
  useEffect(() => {
    if (isOpen && !hasScrolledRef.current && phase === requiredPhase) {
      hasScrolledRef.current = true;
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, phase, requiredPhase]);

  // Reset scroll flag when phase resets (new run)
  useEffect(() => {
    if (phase === 0) {
      hasScrolledRef.current = false;
    }
  }, [phase]);

  return (
    <div
      ref={ref}
      id={sectionId}
      className="scroll-mt-40"
    >
      {isOpen ? (
        <div className="animate-fade-in">
          {children}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-graphite-700/40 bg-graphite-950/30 p-6 opacity-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-graphite-600 bg-graphite-900/60 text-[11px] text-paper/30">
            {number}
          </div>
          <div>
            <div className="text-[11px] font-medium text-paper/30">
              {label}
            </div>
            <div className="text-[10px] text-paper/20">
              Waiting for previous step to complete…
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-graphite-600" />
            <span className="text-[10px] text-paper/15">locked</span>
          </div>
        </div>
      )}
    </div>
  );
}
