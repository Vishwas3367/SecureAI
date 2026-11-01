import type { Category, Priority, SecurityRisk } from "@prisma/client";

export type RiskBreakdown = {
  score: number;
  securityRisk: SecurityRisk;
  potentialIssue: string | null;
  affectedService: string | null;
  recommendedAction: string;
  factors: { label: string; points: number }[];
};

const SERVICE_HINTS: { pattern: RegExp; service: string }[] = [
  { pattern: /hr portal|workday|peopleSoft/i, service: "HR Portal" },
  { pattern: /vpn/i, service: "VPN Gateway" },
  { pattern: /email|outlook|exchange/i, service: "Email" },
  { pattern: /sso|okta|authentication|login|auth/i, service: "Authentication" },
  { pattern: /database|sql|postgres|oracle/i, service: "Database" },
  { pattern: /firewall|network|dns|wifi/i, service: "Network" },
  { pattern: /laptop|hardware|printer/i, service: "Endpoint" },
  { pattern: /aws|azure|cloud/i, service: "Cloud Infrastructure" },
];

type IncidentLike = {
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  sourceIp?: string | null;
  sourceGeo?: string | null;
  affectedAccounts?: number | null;
  afterHours?: boolean | null;
  relatedCount?: number;
};

export function analyzeSecurityRisk(incident: IncidentLike): RiskBreakdown {
  const text = `${incident.title} ${incident.description}`.toLowerCase();
  const factors: { label: string; points: number }[] = [];
  let potentialIssue: string | null = null;

  const add = (label: string, points: number, issue?: string) => {
    factors.push({ label, points });
    if (issue && !potentialIssue) potentialIssue = issue;
  };

  if (/failed login|brute force|credential stuffing|password spray/.test(text)) {
    add("Multiple failed login attempts", 25, "Credential Attack");
  }
  if (/unusual (ip|geo|location)|foreign ip|tor |vpn hop|unknown country/.test(text) || incident.sourceGeo) {
    if (/unusual|foreign|unknown|tor/.test(text) || (incident.sourceGeo && /outside|unusual/i.test(incident.sourceGeo))) {
      add("Unusual geographic location", 20, potentialIssue ?? "Anomalous Access");
    }
  }
  if ((incident.affectedAccounts ?? 0) >= 3 || /multiple (employees|accounts|users)/.test(text)) {
    add("Multiple affected accounts", 18, potentialIssue ?? "Account Compromise Cluster");
  }
  if (incident.afterHours || /after hours|outside (normal|business) hours|3am|midnight/.test(text)) {
    add("Activity outside normal hours", 14);
  }
  if ((incident.relatedCount ?? 0) > 0 || /recurring|again|same as last/.test(text)) {
    add("Previous related incidents", 10);
  }
  if (/ransomware|malware|trojan|cryptolocker/.test(text)) {
    add("Malware / ransomware indicators", 40, "Malware Event");
  }
  if (/data leak|exfiltrat|pii|customer data|stolen/.test(text)) {
    add("Potential data exposure", 35, "Data Exfiltration Risk");
  }
  if (/privilege escalation|admin rights|domain admin/.test(text)) {
    add("Privilege escalation language", 30, "Privilege Abuse");
  }
  if (/phish|spear.?phish|suspicious email/.test(text)) {
    add("Phishing indicators", 20, "Phishing Campaign");
  }
  if (/ddos|denial of service|traffic spike/.test(text)) {
    add("Availability attack indicators", 25, "Denial of Service");
  }
  if (/certificate|tls|ssl expired/.test(text)) {
    add("Certificate / TLS issue", 15, "Expired Certificate");
  }
  if (incident.priority === "CRITICAL") add("Marked critical priority", 15);
  if (incident.priority === "HIGH") add("Marked high priority", 8);
  if (incident.category === "SECURITY") add("Classified as security incident", 12);
  if (/cannot access|outage|down|unavailable/.test(text)) {
    add("Service availability impact", 8);
  }

  const score = Math.min(
    100,
    factors.reduce((sum, f) => sum + f.points, 0),
  );

  const securityRisk: SecurityRisk =
    score >= 80 ? "CRITICAL" : score >= 55 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

  const affectedService =
    SERVICE_HINTS.find((s) => s.pattern.test(text))?.service ??
    (incident.category === "SECURITY" ? "Security Operations" : incident.category);

  const recommendedAction = buildRecommendedAction(securityRisk, potentialIssue, affectedService);

  return {
    score,
    securityRisk,
    potentialIssue,
    affectedService,
    recommendedAction,
    factors: factors.sort((a, b) => b.points - a.points),
  };
}

function buildRecommendedAction(
  risk: SecurityRisk,
  issue: string | null,
  service: string,
): string {
  const steps = [
    `1. Verify the health and recent logs of ${service}.`,
    issue
      ? `2. Investigate whether this matches a ${issue.toLowerCase()} pattern.`
      : "2. Confirm scope: users, systems, and time window.",
    "3. Contain suspicious activity if risk is HIGH or CRITICAL (restrict IPs / lock accounts as needed).",
    "4. Document findings and notify the on-call owner before closing.",
  ];
  if (risk === "LOW") {
    return `Low security risk. Validate the report, check ${service} status, and resolve through standard IT process.`;
  }
  return steps.join("\n");
}
