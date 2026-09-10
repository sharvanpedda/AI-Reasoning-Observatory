export default function ErrorBanner({
  errors,
}: {
  errors: { message: string; recoverable: boolean; note?: string; channel: string }[];
}) {
  if (errors.length === 0) return null;
  return (
    <div className="mb-4 space-y-2 animate-slide-up">
      {errors.map((e, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
            e.recoverable
              ? "border-amber-500/25 bg-amber-500/5 text-amber-200/80"
              : "border-red-500/30 bg-red-500/5 text-red-200/90"
          }`}
        >
          <span className="mt-0.5 text-base">{e.recoverable ? "⚠️" : "❌"}</span>
          <div>
            <span className="font-medium">{e.recoverable ? "Recovered: " : "Error: "}</span>
            {e.message}
            {e.note && (
              <span className={`ml-1.5 text-[11px] ${e.recoverable ? "text-amber-300/60" : "text-red-300/60"}`}>
                {e.note}
              </span>
            )}
            {e.channel !== "system" && (
              <span className="ml-1.5 text-[10px] text-paper/30">({e.channel})</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
