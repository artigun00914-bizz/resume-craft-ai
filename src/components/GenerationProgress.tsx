import { useEffect, useState } from "react";

const STAGES = [
  "Reading job description…",
  "Extracting required skills…",
  "Optimizing ATS keywords…",
  "Crafting human-style bullets…",
  "Finalizing resume…",
];

export function GenerationProgress({ active }: { active: boolean }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!active) {
      setStage(0);
      return;
    }
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1400);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  return (
    <div className="glass rounded-xl p-4 space-y-2">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-3 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              i < stage ? "bg-[var(--success)]" : i === stage ? "bg-primary pulse-dot" : "bg-muted-foreground/30"
            }`}
          />
          <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{s}</span>
        </div>
      ))}
    </div>
  );
}
