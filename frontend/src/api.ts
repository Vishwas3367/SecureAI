export type Role = "ADMIN" | "SECURITY_ANALYST" | "IT_ANALYST" | "EMPLOYEE";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  department?: string | null;
};

export type RiskFactor = { id?: string; label: string; points: number };

export type Incident = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdBy: { id: string; name: string; email: string; role?: string };
  assignedTo?: { id: string; name: string; email: string } | null;
  aiCategory?: string | null;
  aiPriority?: string | null;
  aiConfidence?: number | null;
  aiAccepted: boolean;
  riskScore: number;
  securityRisk?: string | null;
  potentialIssue?: string | null;
  affectedService?: string | null;
  recommendedAction?: string | null;
  rootCause?: string | null;
  rootCauseConfidence?: number | null;
  recommendedResolution?: string | null;
  sourceIp?: string | null;
  sourceGeo?: string | null;
  affectedAccounts: number;
  afterHours: boolean;
  slaDueAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  riskFactors: RiskFactor[];
  relatedFrom?: {
    toIncident: { id: string; ticketNumber: string; title: string; status: string; riskScore?: number };
  }[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  me: () => request<{ user: User }>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  incidents: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return request<{ incidents: Incident[] }>(`/api/incidents${q ? `?${q}` : ""}`);
  },
  incident: (id: string) => request<{ incident: Incident }>(`/api/incidents/${id}`),
  createIncident: (body: unknown) =>
    request<{ incident: Incident }>("/api/incidents", { method: "POST", body: JSON.stringify(body) }),
  updateIncident: (id: string, body: unknown) =>
    request<{ incident: Incident }>(`/api/incidents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  acceptAi: (id: string) =>
    request<{ incident: Incident }>(`/api/incidents/${id}/accept-ai`, { method: "POST" }),
  reanalyze: (id: string) =>
    request<{ incident: Incident }>(`/api/incidents/${id}/reanalyze`, { method: "POST" }),
  overview: () =>
    request<{
      operational: {
        total: number;
        open: number;
        resolved: number;
        slaBreaches: number;
        avgResolutionHours: number;
      };
      security: {
        securityIncidents: number;
        highRisk: number;
        critical: number;
        suspiciousActivities: number;
      };
    }>("/api/analytics/overview"),
  charts: () =>
    request<{
      byCategory: { name: string; value: number }[];
      byPriority: { name: string; value: number }[];
      byRisk: { name: string; value: number }[];
      workload: { name: string; value: number }[];
      trend: { date: string; total: number; security: number }[];
      slaBreaches: { date: string; value: number }[];
      recurring: { label: string; count: number }[];
    }>("/api/analytics/charts"),
  audit: () =>
    request<{
      logs: {
        id: string;
        action: string;
        entityType: string;
        entityId?: string | null;
        previousValue: unknown;
        newValue: unknown;
        createdAt: string;
        user?: { name: string; email: string; role: string } | null;
      }[];
    }>("/api/audit-logs"),
  users: () =>
    request<{ users: User[] }>("/api/users"),
};
