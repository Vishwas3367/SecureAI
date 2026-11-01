import type { ReactNode } from "react";

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "cyan" | "amber" | "rose" | "green" }) {
  const map = {
    slate: "bg-slate-500/15 text-slate-200 border-slate-500/30",
    cyan: "bg-cyan-400/10 text-cyan-200 border-cyan-400/30",
    amber: "bg-amber-400/10 text-amber-200 border-amber-400/30",
    rose: "bg-rose-400/10 text-rose-200 border-rose-400/30",
    green: "bg-emerald-400/10 text-emerald-200 border-emerald-400/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

export function priorityTone(p: string) {
  if (p === "CRITICAL") return "rose" as const;
  if (p === "HIGH") return "amber" as const;
  if (p === "MEDIUM") return "cyan" as const;
  return "slate" as const;
}

export function riskTone(r?: string | null) {
  if (r === "CRITICAL") return "rose" as const;
  if (r === "HIGH") return "amber" as const;
  if (r === "MEDIUM") return "cyan" as const;
  return "green" as const;
}

export function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#1d334d] bg-[#0c1a2e]/80 p-5">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#1d334d] bg-[#0c1a2e]/80 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
