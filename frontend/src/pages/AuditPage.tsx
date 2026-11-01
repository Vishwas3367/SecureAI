import { useEffect, useState } from "react";
import { api } from "../api";
import { Card } from "../components/ui";

export function AuditPage() {
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof api.audit>>["logs"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .audit()
      .then((d) => setLogs(d.logs))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-2 text-sm text-slate-400">Privileged actions are recorded with actor, before/after, and time.</p>
      {error ? <div className="mt-4 text-rose-300">{error}</div> : null}
      <div className="mt-6 space-y-3">
        {logs.map((log) => (
          <Card key={log.id} title={log.action}>
            <div className="text-xs text-slate-400">
              User: {log.user?.name ?? "system"} ({log.user?.email ?? "—"}) ·{" "}
              {new Date(log.createdAt).toLocaleString()}
            </div>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <div className="text-slate-500">Previous</div>
                <pre className="mt-1 overflow-x-auto text-slate-300">{JSON.stringify(log.previousValue, null, 2)}</pre>
              </div>
              <div>
                <div className="text-slate-500">New</div>
                <pre className="mt-1 overflow-x-auto text-slate-300">{JSON.stringify(log.newValue, null, 2)}</pre>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
