import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Incident } from "../api";
import { Badge, priorityTone, riskTone } from "../components/ui";

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .incidents(q ? { q } : undefined)
        .then((d) => setIncidents(d.incidents))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-sm text-slate-400">Search, triage, and open the Why panel on any ticket.</p>
        </div>
        <Link to="/incidents/new" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-[#07111f]">
          New incident
        </Link>
      </div>
      <input
        placeholder="Search title, ticket, or description"
        className="mt-6 w-full max-w-lg rounded-lg border border-[#1d334d] bg-[#0c1a2e] px-3 py-2 text-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error ? <div className="mt-4 text-rose-300">{error}</div> : null}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#1d334d]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0c1a2e] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id} className="border-t border-[#1d334d] hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-cyan-200">
                  <Link to={`/incidents/${i.id}`}>{i.ticketNumber}</Link>
                </td>
                <td className="px-4 py-3">{i.title}</td>
                <td className="px-4 py-3">{i.category}</td>
                <td className="px-4 py-3">
                  <Badge tone={priorityTone(i.priority)}>{i.priority}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={riskTone(i.securityRisk)}>
                    {i.riskScore} {i.securityRisk ?? ""}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-300">{i.status.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
