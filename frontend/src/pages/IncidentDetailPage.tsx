import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Incident } from "../api";
import { useAuth } from "../auth";
import { Badge, Card, priorityTone, riskTone } from "../components/ui";

export function IncidentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const analyst = user && user.role !== "EMPLOYEE";

  async function load() {
    if (!id) return;
    const data = await api.incident(id);
    setIncident(data.incident);
    setStatus(data.incident.status);
    setCategory(data.incident.category);
    setPriority(data.incident.priority);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [id]);

  if (error) return <div className="text-rose-300">{error}</div>;
  if (!incident) return <div className="text-slate-400">Loading incident…</div>;

  const pct = Math.round((incident.aiConfidence ?? 0) * 100);
  const rcPct = Math.round((incident.rootCauseConfidence ?? 0) * 100);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div>
          <div className="font-mono text-sm text-cyan-300">{incident.ticketNumber}</div>
          <h1 className="mt-1 text-2xl font-semibold">{incident.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={priorityTone(incident.priority)}>{incident.priority}</Badge>
            <Badge>{incident.category}</Badge>
            <Badge tone={riskTone(incident.securityRisk)}>{incident.securityRisk ?? "UNSCORED"}</Badge>
            <Badge tone={incident.status === "RESOLVED" || incident.status === "CLOSED" ? "green" : "cyan"}>
              {incident.status.replaceAll("_", " ")}
            </Badge>
          </div>
        </div>
        <Card title="Narrative">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{incident.description}</p>
          <dl className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
            <div>Reporter: {incident.createdBy.name}</div>
            <div>Assignee: {incident.assignedTo?.name ?? "Unassigned"}</div>
            <div>Source IP: {incident.sourceIp ?? "—"}</div>
            <div>Geo: {incident.sourceGeo ?? "—"}</div>
            <div>Affected accounts: {incident.affectedAccounts}</div>
            <div>After hours: {incident.afterHours ? "Yes" : "No"}</div>
          </dl>
        </Card>
        <Card title="AI classification">
          <div className="text-sm text-slate-300">
            Category: <span className="text-white">{incident.aiCategory ?? "—"}</span> · Priority:{" "}
            <span className="text-white">{incident.aiPriority ?? "—"}</span> · Confidence: {pct}%
          </div>
          <p className="mt-2 text-xs text-slate-500">The analyst can accept this suggestion or modify the live fields.</p>
          {analyst ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-medium text-[#07111f]"
                onClick={async () => {
                  await api.acceptAi(incident.id);
                  await load();
                }}
              >
                Accept AI classification
              </button>
              <button
                className="rounded-lg border border-[#1d334d] px-3 py-1.5 text-sm"
                onClick={async () => {
                  await api.reanalyze(incident.id);
                  await load();
                }}
              >
                Re-run analysis
              </button>
            </div>
          ) : null}
        </Card>
        <Card title="AI root-cause suggestion">
          <p className="text-sm">{incident.rootCause}</p>
          <p className="mt-2 text-xs text-slate-500">Confidence: {rcPct}%</p>
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">Related historical incidents</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(incident.relatedFrom ?? []).length === 0 ? (
                <span className="text-sm text-slate-500">None linked</span>
              ) : (
                incident.relatedFrom!.map((r) => (
                  <Link
                    key={r.toIncident.id}
                    to={`/incidents/${r.toIncident.id}`}
                    className="rounded-full border border-[#1d334d] px-3 py-1 font-mono text-xs text-cyan-200"
                  >
                    {r.toIncident.ticketNumber}
                  </Link>
                ))
              )}
            </div>
          </div>
        </Card>
        <Card title="AI-generated recommendation — analyst verification required">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-300">
            {incident.recommendedResolution}
          </pre>
        </Card>
        {analyst ? (
          <Card title="Analyst decision">
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                className="rounded-lg border border-[#1d334d] bg-[#07111f] px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {["ACCESS", "APPLICATION", "NETWORK", "INFRASTRUCTURE", "SECURITY", "HARDWARE", "EMAIL", "DATABASE", "OTHER"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
              <select
                className="rounded-lg border border-[#1d334d] bg-[#07111f] px-3 py-2 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                className="rounded-lg border border-[#1d334d] bg-[#07111f] px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              className="mt-4 rounded-lg border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200"
              onClick={async () => {
                await api.updateIncident(incident.id, { category, priority, status });
                await load();
              }}
            >
              Save changes (audited)
            </button>
          </Card>
        ) : null}
      </div>
      <div className="space-y-6">
        <Card title="Why?">
          <div className="text-4xl font-semibold tabular-nums">
            {incident.riskScore} <span className="text-lg text-slate-500">/ 100</span>
          </div>
          <div className="mt-1 text-sm text-amber-200">AI Assessment: {incident.securityRisk ?? "LOW"} RISK</div>
          <div className="mt-4 space-y-2">
            {incident.riskFactors.length === 0 ? (
              <div className="text-sm text-slate-500">No elevated risk factors on this ticket.</div>
            ) : (
              incident.riskFactors.map((f) => (
                <div key={f.label} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-300">{f.label}</span>
                  <span className="shrink-0 font-mono text-cyan-200">+{f.points}</span>
                </div>
              ))
            )}
          </div>
          {incident.potentialIssue ? (
            <div className="mt-4 text-sm">
              Potential issue: <span className="text-white">{incident.potentialIssue}</span>
            </div>
          ) : null}
          {incident.affectedService ? (
            <div className="text-sm text-slate-400">Affected service: {incident.affectedService}</div>
          ) : null}
          <pre className="mt-4 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-400">
            {incident.recommendedAction}
          </pre>
        </Card>
      </div>
    </div>
  );
}
