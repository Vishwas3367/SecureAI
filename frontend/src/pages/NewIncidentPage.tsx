import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function NewIncidentPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceIp, setSourceIp] = useState("");
  const [sourceGeo, setSourceGeo] = useState("");
  const [affectedAccounts, setAffectedAccounts] = useState("0");
  const [afterHours, setAfterHours] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { incident } = await api.createIncident({
        title,
        description,
        sourceIp: sourceIp || null,
        sourceGeo: sourceGeo || null,
        affectedAccounts: Number(affectedAccounts) || 0,
        afterHours,
      });
      navigate(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Create incident</h1>
      <p className="mt-2 text-sm text-slate-400">
        AI classification, risk scoring, root-cause suggestion, and a resolution runbook are generated on submit. An
        analyst can accept or override every field.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          Title
          <input
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-[#1d334d] bg-[#0c1a2e] px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Multiple employees cannot access the internal HR portal"
          />
        </label>
        <label className="block text-sm">
          Description
          <textarea
            required
            minLength={20}
            rows={6}
            className="mt-1 w-full rounded-lg border border-[#1d334d] bg-[#0c1a2e] px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened, who is affected, and any logs or IPs you already have."
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Source IP
            <input
              className="mt-1 w-full rounded-lg border border-[#1d334d] bg-[#0c1a2e] px-3 py-2"
              value={sourceIp}
              onChange={(e) => setSourceIp(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Source geo
            <input
              className="mt-1 w-full rounded-lg border border-[#1d334d] bg-[#0c1a2e] px-3 py-2"
              value={sourceGeo}
              onChange={(e) => setSourceGeo(e.target.value)}
              placeholder="Unusual / outside corporate regions"
            />
          </label>
        </div>
        <label className="block text-sm">
          Affected accounts
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border border-[#1d334d] bg-[#0c1a2e] px-3 py-2"
            value={affectedAccounts}
            onChange={(e) => setAffectedAccounts(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={afterHours} onChange={(e) => setAfterHours(e.target.checked)} />
          Activity outside normal hours
        </label>
        {error ? <div className="text-sm text-rose-300">{error}</div> : null}
        <button disabled={busy} className="rounded-lg bg-cyan-400 px-4 py-2 font-medium text-[#07111f] disabled:opacity-60">
          {busy ? "Analyzing…" : "Submit for AI analysis"}
        </button>
      </form>
    </div>
  );
}
