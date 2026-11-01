import bcrypt from "bcryptjs";
import { PrismaClient, type IncidentStatus } from "@prisma/client";
import { runAiAnalysis } from "../src/services/aiEngine.js";
import { slaHours } from "../src/services/incidents.js";

const prisma = new PrismaClient();

type SeedIncident = {
  ticket: string;
  title: string;
  description: string;
  daysAgo: number;
  hoursOpen?: number;
  status: IncidentStatus;
  sourceIp?: string;
  sourceGeo?: string;
  affectedAccounts?: number;
  afterHours?: boolean;
  assigneeEmail?: string;
  creatorEmail: string;
};

const incidents: SeedIncident[] = [
  {
    ticket: "INC-1023",
    title: "Users cannot authenticate after overnight outage",
    description:
      "Multiple employees cannot access the internal HR portal. Authentication service returned certificate errors. Recurring issue similar to last quarter.",
    daysAgo: 48,
    hoursOpen: 6,
    status: "RESOLVED",
    affectedAccounts: 40,
    creatorEmail: "employee@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1178",
    title: "Expired authentication service certificate",
    description:
      "SSO login failures across applications. TLS certificate on the authentication service appears expired. Users see untrusted certificate warnings.",
    daysAgo: 32,
    hoursOpen: 4,
    status: "RESOLVED",
    creatorEmail: "employee@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1241",
    title: "HR portal login failures after certificate rotation",
    description:
      "After a certificate change, employees cannot access the HR portal. Application / access issue with high user impact.",
    daysAgo: 18,
    hoursOpen: 5,
    status: "RESOLVED",
    affectedAccounts: 22,
    creatorEmail: "priya@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1302",
    title: "Multiple failed login attempts from unusual IP addresses",
    description:
      "Authentication logs show a credential stuffing pattern from unusual geographic locations. Multiple affected accounts attempted after hours. Review authentication logs immediately.",
    daysAgo: 2,
    status: "IN_PROGRESS",
    sourceIp: "185.220.101.44",
    sourceGeo: "Unusual / outside corporate regions",
    affectedAccounts: 17,
    afterHours: true,
    creatorEmail: "security@secureai.dev",
    assigneeEmail: "security@secureai.dev",
  },
  {
    ticket: "INC-1310",
    title: "Phishing campaign targeting finance mailbox",
    description:
      "Suspicious email with credential harvest links sent to the finance team. Several users reported a fake SSO page. Potential phishing campaign.",
    daysAgo: 1,
    status: "OPEN",
    affectedAccounts: 9,
    creatorEmail: "priya@secureai.dev",
    assigneeEmail: "security@secureai.dev",
  },
  {
    ticket: "INC-1288",
    title: "VPN gateway intermittent packet loss",
    description:
      "Remote staff report high latency and packet loss on the corporate VPN. Network path looks degraded after a firewall policy change.",
    daysAgo: 5,
    hoursOpen: 10,
    status: "RESOLVED",
    creatorEmail: "employee@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1294",
    title: "Production database CPU saturation",
    description:
      "Checkout API latency spiked. Postgres CPU at 96% after a long-running analytics query. Database replication lag increasing.",
    daysAgo: 4,
    hoursOpen: 3,
    status: "RESOLVED",
    creatorEmail: "it@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1318",
    title: "Possible ransomware indicators on file share",
    description:
      "Endpoint detection flagged cryptolocker-like file extensions on a departmental share. Malware / ransomware indicators with potential data exposure.",
    daysAgo: 0,
    status: "OPEN",
    afterHours: true,
    creatorEmail: "security@secureai.dev",
    assigneeEmail: "security@secureai.dev",
  },
  {
    ticket: "INC-1255",
    title: "Outlook mailbox cannot send external mail",
    description:
      "One user cannot send email to external domains. Exchange connector reports TLS handshake issues.",
    daysAgo: 12,
    hoursOpen: 8,
    status: "CLOSED",
    creatorEmail: "employee@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1260",
    title: "Wi-Fi outage on Floor 4",
    description:
      "Wireless network unavailable for the design team. Switch in IDF-4 may have crashed.",
    daysAgo: 9,
    hoursOpen: 2,
    status: "RESOLVED",
    creatorEmail: "priya@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1271",
    title: "Laptop will not boot after patch night",
    description:
      "Employee hardware issue: laptop stuck on BitLocker recovery after overnight Windows patches.",
    daysAgo: 7,
    hoursOpen: 20,
    status: "RESOLVED",
    creatorEmail: "employee@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1321",
    title: "Privilege escalation request looks suspicious",
    description:
      "User requested domain admin rights via an unusual ticket. Privilege escalation language and after hours activity.",
    daysAgo: 0,
    status: "PENDING",
    afterHours: true,
    creatorEmail: "security@secureai.dev",
    assigneeEmail: "security@secureai.dev",
  },
  {
    ticket: "INC-1210",
    title: "DNS resolution failures for partner API",
    description:
      "Network DNS lookups for api.partner.example intermittently fail. Application timeouts on checkout.",
    daysAgo: 21,
    hoursOpen: 7,
    status: "RESOLVED",
    creatorEmail: "it@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1222",
    title: "Cannot access internal HR portal",
    description:
      "Multiple employees cannot access the internal HR portal. SSO redirects loop. Application / access.",
    daysAgo: 16,
    hoursOpen: 9,
    status: "RESOLVED",
    affectedAccounts: 12,
    creatorEmail: "employee@secureai.dev",
    assigneeEmail: "it@secureai.dev",
  },
  {
    ticket: "INC-1330",
    title: "Brute force failed login against VPN",
    description:
      "Multiple failed login attempts from a foreign IP against the VPN concentrator after hours. Credential attack pattern.",
    daysAgo: 0,
    status: "OPEN",
    sourceIp: "91.219.236.18",
    sourceGeo: "Unusual / foreign IP",
    affectedAccounts: 6,
    afterHours: true,
    creatorEmail: "security@secureai.dev",
    assigneeEmail: "security@secureai.dev",
  },
];

function extraIncidents(): SeedIncident[] {
  const titles = [
    ["Slow intranet search", "Intranet search is slow for one user in marketing. Intermittent slowness."],
    ["Printer jam in finance", "Hardware printer on floor 2 repeatedly jams after toner replacement."],
    ["Okta MFA push fatigue", "User reports repeated MFA prompts. Possible unauthorized login attempts."],
    ["AWS CPU credits exhausted", "Cloud infrastructure burst credits depleted on the reporting instance."],
    ["Exchange storage quota", "Mailbox cannot receive email because quota exceeded."],
    ["Firewall alert on outbound 445", "IDS / firewall alert for unusual SMB traffic. Unauthorized connection attempt."],
    ["Badge reader offline", "Hardware badge reader at dock door is offline."],
    ["Kubernetes node NotReady", "Infrastructure node drained unexpectedly. Pods pending."],
    ["SQL replication lag", "Database replica is 14 minutes behind primary."],
    ["Cannot access shared drive", "Access issue: finance share denies NTFS permissions after group change."],
  ];
  return titles.map((t, i) => ({
    ticket: `INC-${1400 + i}`,
    title: t[0],
    description: t[1],
    daysAgo: 3 + i,
    hoursOpen: i % 3 === 0 ? undefined : 5 + i,
    status: (i % 3 === 0 ? "OPEN" : i % 3 === 1 ? "RESOLVED" : "CLOSED") as IncidentStatus,
    creatorEmail: i % 2 === 0 ? "employee@secureai.dev" : "priya@secureai.dev",
    assigneeEmail: i % 4 === 0 ? "security@secureai.dev" : "it@secureai.dev",
    afterHours: i === 5,
    affectedAccounts: i === 2 ? 4 : 0,
  }));
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.incidentRelation.deleteMany();
  await prisma.riskFactor.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("SecureAI!123", 12);

  const users = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: "admin@secureai.dev",
        name: "Alex Admin",
        passwordHash,
        role: "ADMIN",
        department: "IT Leadership",
      },
    }),
    prisma.user.create({
      data: {
        email: "security@secureai.dev",
        name: "Sam Analyst",
        passwordHash,
        role: "SECURITY_ANALYST",
        department: "Security Operations",
      },
    }),
    prisma.user.create({
      data: {
        email: "it@secureai.dev",
        name: "Ira Patel",
        passwordHash,
        role: "IT_ANALYST",
        department: "Service Desk",
      },
    }),
    prisma.user.create({
      data: {
        email: "employee@secureai.dev",
        name: "Evan Lee",
        passwordHash,
        role: "EMPLOYEE",
        department: "Human Resources",
      },
    }),
    prisma.user.create({
      data: {
        email: "priya@secureai.dev",
        name: "Priya Shah",
        passwordHash,
        role: "EMPLOYEE",
        department: "Finance",
      },
    }),
  ]);

  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const all = [...incidents, ...extraIncidents()];
  const createdIds: { ticket: string; id: string }[] = [];

  for (const item of all) {
    const analysis = await runAiAnalysis({
      title: item.title,
      description: item.description,
      sourceIp: item.sourceIp,
      sourceGeo: item.sourceGeo,
      affectedAccounts: item.affectedAccounts,
      afterHours: item.afterHours,
    });
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - item.daysAgo);
    createdAt.setHours(9 + (item.daysAgo % 8), 15, 0, 0);
    const slaDueAt = new Date(createdAt);
    slaDueAt.setHours(slaDueAt.getHours() + slaHours(analysis.classification.priority));
    let resolvedAt: Date | null = null;
    if (item.status === "RESOLVED" || item.status === "CLOSED") {
      resolvedAt = new Date(createdAt);
      resolvedAt.setHours(resolvedAt.getHours() + (item.hoursOpen ?? 6));
    }

    const row = await prisma.incident.create({
      data: {
        ticketNumber: item.ticket,
        title: item.title,
        description: item.description,
        category: analysis.classification.category,
        priority: analysis.classification.priority,
        status: item.status,
        createdById: byEmail[item.creatorEmail].id,
        assignedToId: item.assigneeEmail ? byEmail[item.assigneeEmail].id : undefined,
        aiCategory: analysis.classification.category,
        aiPriority: analysis.classification.priority,
        aiConfidence: analysis.classification.confidence,
        aiAccepted: item.status !== "OPEN",
        riskScore: analysis.risk.score,
        securityRisk: analysis.risk.securityRisk,
        potentialIssue: analysis.risk.potentialIssue,
        affectedService: analysis.risk.affectedService,
        recommendedAction: analysis.risk.recommendedAction,
        rootCause: analysis.rootCause.rootCause,
        rootCauseConfidence: analysis.rootCause.confidence,
        recommendedResolution: analysis.rootCause.recommendedResolution,
        sourceIp: item.sourceIp,
        sourceGeo: item.sourceGeo,
        affectedAccounts: item.affectedAccounts ?? 0,
        afterHours: item.afterHours ?? false,
        slaDueAt,
        resolvedAt,
        createdAt,
        updatedAt: resolvedAt ?? createdAt,
        riskFactors: {
          create: analysis.risk.factors.map((f) => ({ label: f.label, points: f.points })),
        },
      },
    });
    createdIds.push({ ticket: item.ticket, id: row.id });
  }

  const idByTicket = Object.fromEntries(createdIds.map((c) => [c.ticket, c.id]));
  const links = [
    ["INC-1023", "INC-1178"],
    ["INC-1023", "INC-1241"],
    ["INC-1178", "INC-1241"],
    ["INC-1302", "INC-1330"],
    ["INC-1222", "INC-1023"],
  ];
  for (const [from, to] of links) {
    await prisma.incidentRelation.create({
      data: { fromIncidentId: idByTicket[from], toIncidentId: idByTicket[to] },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: byEmail["it@secureai.dev"].id,
      action: "Updated Incident #1024",
      entityType: "Incident",
      entityId: idByTicket["INC-1023"],
      previousValue: { status: "Open" },
      newValue: { status: "Resolved" },
      createdAt: new Date("2026-09-19T22:43:00Z"),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: byEmail["security@secureai.dev"].id,
      action: "Accepted AI classification for INC-1302",
      entityType: "Incident",
      entityId: idByTicket["INC-1302"],
      previousValue: { category: "ACCESS" },
      newValue: { category: "SECURITY" },
    },
  });

  console.log(`Seeded ${users.length} users and ${createdIds.length} incidents.`);
  console.log("Demo login: admin@secureai.dev / SecureAI!123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
