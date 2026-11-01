import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);
analyticsRouter.use(requireRoles("ADMIN", "IT_ANALYST", "SECURITY_ANALYST"));

analyticsRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const securityOnly = req.user!.role === "SECURITY_ANALYST";

    const where = securityOnly
      ? { OR: [{ category: "SECURITY" as const }, { securityRisk: { in: ["HIGH" as const, "CRITICAL" as const] } }] }
      : {};

    const [
      total,
      open,
      resolved,
      slaBreaches,
      securityIncidents,
      highRisk,
      critical,
    ] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.count({ where: { ...where, status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] } } }),
      prisma.incident.count({ where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.incident.count({
        where: {
          ...where,
          slaDueAt: { lt: now },
          status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] },
        },
      }),
      prisma.incident.count({ where: { category: "SECURITY" } }),
      prisma.incident.count({ where: { securityRisk: "HIGH" } }),
      prisma.incident.count({ where: { securityRisk: "CRITICAL" } }),
    ]);

    const resolvedRows = await prisma.incident.findMany({
      where: { ...where, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });
    const avgMs =
      resolvedRows.length === 0
        ? 0
        : resolvedRows.reduce(
            (sum, r) => sum + (r.resolvedAt!.getTime() - r.createdAt.getTime()),
            0,
          ) / resolvedRows.length;

    const suspicious = await prisma.incident.count({
      where: {
        OR: [
          { potentialIssue: { not: null } },
          { securityRisk: { in: ["HIGH", "CRITICAL"] } },
        ],
      },
    });

    res.json({
      operational: {
        total,
        open,
        resolved,
        slaBreaches,
        avgResolutionHours: Number((avgMs / 36e5).toFixed(1)),
      },
      security: {
        securityIncidents,
        highRisk,
        critical,
        suspiciousActivities: suspicious,
      },
    });
  }),
);

analyticsRouter.get(
  "/charts",
  asyncHandler(async (_req, res) => {
    const incidents = await prisma.incident.findMany({
      select: {
        category: true,
        priority: true,
        status: true,
        securityRisk: true,
        createdAt: true,
        resolvedAt: true,
        assignedTo: { select: { name: true } },
        title: true,
      },
    });

    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};
    const trend: Record<string, { total: number; security: number }> = {};

    for (const i of incidents) {
      byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
      byPriority[i.priority] = (byPriority[i.priority] ?? 0) + 1;
      if (i.securityRisk) byRisk[i.securityRisk] = (byRisk[i.securityRisk] ?? 0) + 1;
      const owner = i.assignedTo?.name ?? "Unassigned";
      byAssignee[owner] = (byAssignee[owner] ?? 0) + 1;
      const day = i.createdAt.toISOString().slice(0, 10);
      if (!trend[day]) trend[day] = { total: 0, security: 0 };
      trend[day].total += 1;
      if (i.category === "SECURITY") trend[day].security += 1;
    }

    const titleCounts: Record<string, number> = {};
    for (const i of incidents) {
      const key = i.title.replace(/\d+/g, "").trim().slice(0, 48);
      titleCounts[key] = (titleCounts[key] ?? 0) + 1;
    }
    const recurring = Object.entries(titleCounts)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count }));

    const slaBreachesByDay: Record<string, number> = {};
    const openWithSla = await prisma.incident.findMany({
      where: { slaDueAt: { not: null } },
      select: { slaDueAt: true, status: true, createdAt: true, resolvedAt: true },
    });
    for (const row of openWithSla) {
      const closed = row.resolvedAt ?? (["RESOLVED", "CLOSED"].includes(row.status) ? row.slaDueAt : null);
      const breached = closed ? closed > row.slaDueAt! : new Date() > row.slaDueAt!;
      if (breached) {
        const day = row.createdAt.toISOString().slice(0, 10);
        slaBreachesByDay[day] = (slaBreachesByDay[day] ?? 0) + 1;
      }
    }

    res.json({
      byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
      byRisk: Object.entries(byRisk).map(([name, value]) => ({ name, value })),
      workload: Object.entries(byAssignee).map(([name, value]) => ({ name, value })),
      trend: Object.entries(trend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v })),
      slaBreaches: Object.entries(slaBreachesByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value })),
      recurring,
    });
  }),
);
