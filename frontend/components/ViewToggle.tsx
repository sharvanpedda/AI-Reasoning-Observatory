"use client";

/**
 * ViewToggle — the architecture switch.
 * "split" is now the DEFAULT: both architectures side by side so judges
 * see the contrast in one glance instead of flipping back and forth.
 */

export type View = "conventional" | "bdh" | "split";

const OPTIONS: { key: View; label: string; hint: string; active: string }[] = [
  {
    key: "conventional",
    label: "Conventional",
    hint: "KV-cache grows O(n)",
    active: "border-amber-400/60 bg-amber-400/15 text-amber-200",
  },
  {
    key: "split",
    label: "Split view",
    hint: "both at once — recommended",
    active: "border-violet-400/60 bg-violet-400/15 text-violet-200",
  },
  {
    key: "bdh",
    label: "BDH-CQ latent",
    hint: "fixed state O(1)",
    active: "border-cyan-400/60 bg-cyan-400/15 text-cyan-200",
  },
];

export default function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full max-w-xl rounded-xl border border-graphite-700 bg-graphite-950/60 p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={view === opt.key}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
              view === opt.key
                ? `${opt.active} shadow`
                : "text-paper/40 hover:text-paper/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-paper/35">
        {OPTIONS.find((o) => o.key === view)?.hint}
      </p>
    </div>
  );
}
