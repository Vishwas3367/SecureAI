import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

const demos = [
  { email: "admin@secureai.dev", role: "Admin" },
  { email: "security@secureai.dev", role: "Security analyst" },
  { email: "it@secureai.dev", role: "IT analyst" },
  { email: "employee@secureai.dev", role: "Employee" },
];

export function LoginPage() {
  const [email, setEmail] = useState("admin@secureai.dev");
  const [password, setPassword] = useState("SecureAI!123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid-overlay flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#1d334d] bg-[#0c1a2e]/90 p-8 shadow-2xl">
        <div className="text-xs tracking-[0.4em] text-cyan-300">SECUREAI</div>
        <h1 className="mt-2 text-2xl font-semibold">Sign in to the operations console</h1>
        <p className="mt-2 text-sm text-slate-400">
          JWT session in an HTTP-only cookie. Analysts still make the final call on AI suggestions.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-[#1d334d] bg-[#07111f] px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-[#1d334d] bg-[#07111f] px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <div className="text-sm text-rose-300">{error}</div> : null}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-cyan-400 py-2.5 font-medium text-[#07111f] disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Continue"}
          </button>
        </form>
        <div className="mt-6 text-xs text-slate-400">
          Demo password for all accounts: <span className="text-slate-200">SecureAI!123</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {demos.map((d) => (
              <button
                key={d.email}
                type="button"
                className="rounded-full border border-[#1d334d] px-2 py-1 hover:border-cyan-400/50"
                onClick={() => setEmail(d.email)}
              >
                {d.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
