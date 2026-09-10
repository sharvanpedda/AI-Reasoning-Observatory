"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ExecutionStatus } from "@/lib/types";

export default function PromptBar({
  status,
  onSubmit,
  onCancel,
}: {
  status: ExecutionStatus;
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isActive = status === "running" || status === "streaming" || status === "preparing";

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || isActive) return;
    onSubmit(trimmed);
  }

  return (
    <div
      className="glow-card group relative rounded-xl border border-graphite-600 bg-graphite-900/80 shadow-lg ring-0 transition-all focus-within:border-amber-500/40 focus-within:ring-1 focus-within:ring-amber-500/20 glow-amber"
      style={{ "--glow": "245,158,60" } as CSSProperties}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask any question — e.g. 'Explain why the sky is blue'"
        rows={2}
        disabled={isActive}
        className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-paper placeholder-paper/25 outline-none disabled:opacity-50"
        style={{ minHeight: "3.5rem", maxHeight: "10rem" }}
      />
      <div className="flex items-center justify-between border-t border-graphite-700/60 px-4 py-2">
        <span className="text-[11px] text-paper/25">
          <kbd className="rounded border border-paper/10 bg-paper/5 px-1 py-0.5 font-mono text-[10px]">Enter</kbd>
          {" "}to run ·{" "}
          <kbd className="rounded border border-paper/10 bg-paper/5 px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd>
          {" "}for newline
        </span>
        <div className="flex items-center gap-2">
          {isActive && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
            >
              ✕ Cancel
            </button>
          )}
          <button
            onClick={submit}
            disabled={isActive || !value.trim()}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-medium text-graphite-950 shadow transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isActive ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-graphite-800 border-t-graphite-950" />
                Running
              </span>
            ) : (
              "▶ Run"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
