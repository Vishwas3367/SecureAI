import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import { useAuth } from "../auth";
import { Card, Kpi } from "../components/ui";

const pieColors = ["#3ee0c5", "#f5b942", "#ff6b7a", "#7aa2ff", "#c084fc", "#94a3b8"];

export function DashboardPage() {
  const { user } = useAuth();
  const isEmployee = user?.role === "EMPLOYEE";
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof api.overview>> | null>(null);
  const [charts, setCharts] = useState<Awaited<ReturnType<typeof api.charts>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEmployee) return;
    void Promise.all([api.overview(), api.charts()])
      .then(([o, c]) => {
        setOverview(o);
        setCharts(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"));
  }, [isEmployee]);

  if (isEmployee) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">My workspace</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          File an incident and track your tickets. AI classification and risk scoring run automatically; an analyst
          reviews every recommendation.
        </p>
        <Link
          to="/incidents/new"
          className="mt-6 inline-flex rounded-lg bg-cyan-400 px-4 py-2 font-medium text-[#07111f]"
        >
          Create incident
        </Link>
        <div className="mt-6">
          <Link to="/incidents" className="text-cyan-300 hover:underline">
            View my tickets →
          </Link>
        </div>
      </div>
    );
  }

  if (error) return <div className="text-rose-300">{error}</div>;
  if (!overview || !charts) return <div className="text-slate-400">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Command center</h1>
        <p className="text-sm text-slate-400">SQL-backed KPIs, security risk, and decision support.</p>
      </div>
      <div>
        <div className="mb-3 text-xs uppercase tracking-wider text-slate-500">Operational KPIs</div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Total incidents" value={overview.operational.total.toLocaleString()} />
          <Kpi label="Open incidents" value={overview.operational.open} />
          <Kpi label="Resolved" value={overview.operational.resolved} />
          <Kpi label="SLA breaches" value={overview.operational.slaBreaches} />
          <Kpi label="Avg resolution" value={`${overview.operational.avgResolutionHours} hrs`} />
        </div>
      </div>
      <div>
        <div className="mb-3 text-xs uppercase tracking-wider text-slate-500">Security KPIs</div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Security incidents" value={overview.security.securityIncidents} />
          <Kpi label="High risk" value={overview.security.highRisk} />
          <Kpi label="Critical" value={overview.security.critical} />
          <Kpi label="Suspicious activities" value={overview.security.suspiciousActivities} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Incidents by category">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={charts.byCategory}>
                <CartesianGrid stroke="#1d334d" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0c1a2e", border: "1px solid #1d334d" }} />
                <Bar dataKey="value" fill="#3ee0c5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Security risk distribution">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={charts.byRisk} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {charts.byRisk.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0c1a2e", border: "1px solid #1d334d" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Incident trends">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={charts.trend}>
                <CartesianGrid stroke="#1d334d" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0c1a2e", border: "1px solid #1d334d" }} />
                <Line type="monotone" dataKey="total" stroke="#3ee0c5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="security" stroke="#ff6b7a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Team workload">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={charts.workload} layout="vertical">
                <CartesianGrid stroke="#1d334d" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0c1a2e", border: "1px solid #1d334d" }} />
                <Bar dataKey="value" fill="#7aa2ff" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Priority mix">
          <div className="space-y-2">
            {charts.byPriority.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <span className="tabular-nums text-slate-300">{p.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recurring issues">
          <div className="space-y-2">
            {charts.recurring.map((r) => (
              <div key={r.label} className="flex items-center justify-between text-sm">
                <span className="pr-4 text-slate-300">{r.label}</span>
                <span className="tabular-nums text-amber-200">{r.count}×</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
