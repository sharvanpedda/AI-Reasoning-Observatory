"use client";

import PromptBar from "./PromptBar";
import type { ObservatoryState } from "@/lib/useExecution";
import type { ExecutionStatus } from "@/lib/types";

/**
 * GuidedTour — simplified. Now just renders the PromptBar with an
 * idle-state hint. The sequential flow is handled by FlowProgress +
 * SectionGate in the page itself.
 */
export default function GuidedTour({
  state,
  onRun,
  onCancel,
}: {
  state: ObservatoryState;
  onRun: (prompt: string) => void;
  onCancel: () => void;
}) {
  const idle = state.status === "idle";

  return (
    <div>
      <PromptBar status={state.status as ExecutionStatus} onSubmit={onRun} onCancel={onCancel} />

      {idle && (
        <p className="mt-2 text-[12px] leading-relaxed text-paper/45">
          Press Enter and this page runs your question through{" "}
          <span className="text-amber-300/80">two AI designs</span> and shows you, live, how
          each one remembers your words and answers you. The page scrolls through
          each section automatically — one step at a time. Everything you see really
          happens — no slides, no fake numbers.
        </p>
      )}
    </div>
  );
}
