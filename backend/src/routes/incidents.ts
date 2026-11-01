import { Router } from "express";
import { z } from "zod";
import type { Category, IncidentStatus, Priority, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, HttpError } from "../middleware/error.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { clientIp, writeAudit } from "../lib/audit.js";
import { runAiAnalysis } from "../services/aiEngine.js";
import { findRelatedIncidents, nextTicketNumber, slaHours } from "../services/incidents.js";

export const incidentRouter = Router();
incidentRouter.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(8).max(160),
  description: z.string().min(20).max(8000),
  sourceIp: z.string().max(64).optional().nullable(),
  sourceGeo: z.string().max(80).optional().nullable(),
  affectedAccounts: z.number().int().min(0).max(100000).optional(),
  afterHours: z.boolean().optional(),
});

const updateSchema = z.object({
  title: z.string().min(8).max(160).optional(),
  description: z.string().min(20).max(8000).optional(),
  category: z.enum(["ACCESS", "APPLICATION", "NETWORK", "INFRASTRUCTURE", "SECURITY", "HARDWARE", "EMAIL", "DATABASE", "OTHER"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  assignedToId: z.string().nullable().optional(),
  resolutionNotes: z.string().max(4000).optional().nullable(),
  rootCause: z.string().max(2000).optional().nullable(),
  aiAccepted: z.boolean().optional(),
});

function canSeeAll(role: Role) {
  return role === "ADMIN" || role === "IT_ANALYST" || role === "SECURITY_ANALYST";
}

function securityOnly(role: Role) {
  return role === "SECURITY_ANALYST";
}

incidentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as IncidentStatus | undefined;
    const category = req.query.category as Category | undefined;
    const q = (req.query.q as string | undefined)?.trim();
    const where: Record<string, unknown> = {};

    if (!canSeeAll(req.user!.role)) {
      where.createdById = req.user!.id;
    } else if (securityOnly(req.user!.role)) {
      where.OR = [{ category: "SECURITY" }, { securityRisk: { in: ["HIGH", "CRITICAL"] } }];
    }
    if (status) where.status = status;
    if (category) where.category = category;
    if (q) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { ticketNumber: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        riskFactors: { orderBy: { points: "desc" } },
      },
      take: 200,
    });
    res.json({ incidents });
  }),
);

incidentRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const analysis = await runAiAnalysis(body);
    const ticketNumber = await nextTicketNumber();
    const related = await findRelatedIncidents(
      body.title,
      body.description,
      analysis.classification.category,
    );
    const due = new Date();
    due.setHours(due.getHours() + slaHours(analysis.classification.priority));

    const incident = await prisma.incident.create({
      data: {
        ticketNumber,
        title: body.title,
        description: body.description,
        category: analysis.classification.category,
        priority: analysis.classification.priority,
        createdById: req.user!.id,
        aiCategory: analysis.classification.category,
        aiPriority: analysis.classification.priority,
        aiConfidence: analysis.classification.confidence,
        riskScore: analysis.risk.score,
        securityRisk: analysis.risk.securityRisk,
        potentialIssue: analysis.risk.potentialIssue,
        affectedService: analysis.risk.affectedService,
        recommendedAction: analysis.risk.recommendedAction,
        rootCause: analysis.rootCause.rootCause,
        rootCauseConfidence: analysis.rootCause.confidence,
        recommendedResolution: analysis.rootCause.recommendedResolution,
        sourceIp: body.sourceIp,
        sourceGeo: body.sourceGeo,
        affectedAccounts: body.affectedAccounts ?? 0,
        afterHours: body.afterHours ?? false,
        slaDueAt: due,
        riskFactors: {
          create: analysis.risk.factors.map((f) => ({ label: f.label, points: f.points })),
        },
        relatedFrom: {
          create: related.map((r) => ({ toIncidentId: r.id })),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        riskFactors: true,
        relatedFrom: { include: { toIncident: { select: { id: true, ticketNumber: true, title: true, status: true } } } },
      },
    });

    await writeAudit({
      userId: req.user!.id,
      action: `Created incident ${ticketNumber}`,
      entityType: "Incident",
      entityId: incident.id,
      newValue: { status: "OPEN", title: incident.title },
      ipAddress: clientIp(req),
    });

    res.status(201).json({
      incident,
      ai: {
        source: analysis.source,
        classification: analysis.classification,
      },
    });
  }),
);

incidentRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const incident = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        riskFactors: { orderBy: { points: "desc" } },
        relatedFrom: {
          include: { toIncident: { select: { id: true, ticketNumber: true, title: true, status: true, riskScore: true } } },
        },
      },
    });
    if (!incident) throw new HttpError(404, "Incident not found");
    if (!canSeeAll(req.user!.role) && incident.createdById !== req.user!.id) {
      throw new HttpError(403, "Insufficient permissions");
    }
    if (
      securityOnly(req.user!.role) &&
      incident.category !== "SECURITY" &&
      incident.securityRisk !== "HIGH" &&
      incident.securityRisk !== "CRITICAL"
    ) {
      throw new HttpError(403, "Insufficient permissions");
    }
    res.json({ incident });
  }),
);

incidentRouter.patch(
  "/:id",
  requireRoles("ADMIN", "IT_ANALYST", "SECURITY_ANALYST"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const existing = await prisma.incident.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Incident not found");

    const resolvedStatuses = ["RESOLVED", "CLOSED"];
    const becomingResolved =
      body.status && resolvedStatuses.includes(body.status) && !resolvedStatuses.includes(existing.status);

    const incident = await prisma.incident.update({
      where: { id: existing.id },
      data: {
        ...body,
        resolvedAt: becomingResolved ? new Date() : body.status && !resolvedStatuses.includes(body.status) ? null : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        riskFactors: { orderBy: { points: "desc" } },
        relatedFrom: {
          include: { toIncident: { select: { id: true, ticketNumber: true, title: true, status: true } } },
        },
      },
    });

    await writeAudit({
      userId: req.user!.id,
      action: `Updated incident ${existing.ticketNumber}`,
      entityType: "Incident",
      entityId: existing.id,
      previousValue: {
        status: existing.status,
        priority: existing.priority,
        category: existing.category,
      },
      newValue: {
        status: incident.status,
        priority: incident.priority,
        category: incident.category,
      },
      ipAddress: clientIp(req),
    });

    res.json({ incident });
  }),
);

incidentRouter.post(
  "/:id/reanalyze",
  requireRoles("ADMIN", "IT_ANALYST", "SECURITY_ANALYST"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.incident.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Incident not found");

    const analysis = await runAiAnalysis({
      title: existing.title,
      description: existing.description,
      sourceIp: existing.sourceIp,
      sourceGeo: existing.sourceGeo,
      affectedAccounts: existing.affectedAccounts,
      afterHours: existing.afterHours,
    });
    const related = await findRelatedIncidents(
      existing.title,
      existing.description,
      analysis.classification.category,
      existing.id,
    );

    await prisma.riskFactor.deleteMany({ where: { incidentId: existing.id } });
    await prisma.incidentRelation.deleteMany({ where: { fromIncidentId: existing.id } });

    const incident = await prisma.incident.update({
      where: { id: existing.id },
      data: {
        aiCategory: analysis.classification.category,
        aiPriority: analysis.classification.priority,
        aiConfidence: analysis.classification.confidence,
        aiAccepted: false,
        riskScore: analysis.risk.score,
        securityRisk: analysis.risk.securityRisk,
        potentialIssue: analysis.risk.potentialIssue,
        affectedService: analysis.risk.affectedService,
        recommendedAction: analysis.risk.recommendedAction,
        rootCause: analysis.rootCause.rootCause,
        rootCauseConfidence: analysis.rootCause.confidence,
        recommendedResolution: analysis.rootCause.recommendedResolution,
        riskFactors: {
          create: analysis.risk.factors.map((f) => ({ label: f.label, points: f.points })),
        },
        relatedFrom: {
          create: related.map((r) => ({ toIncidentId: r.id })),
        },
      },
      include: {
        riskFactors: { orderBy: { points: "desc" } },
        relatedFrom: {
          include: { toIncident: { select: { id: true, ticketNumber: true, title: true, status: true } } },
        },
      },
    });

    await writeAudit({
      userId: req.user!.id,
      action: `Re-ran AI analysis for ${existing.ticketNumber}`,
      entityType: "Incident",
      entityId: existing.id,
      ipAddress: clientIp(req),
    });

    res.json({ incident, ai: { source: analysis.source, classification: analysis.classification } });
  }),
);

incidentRouter.post(
  "/:id/accept-ai",
  requireRoles("ADMIN", "IT_ANALYST", "SECURITY_ANALYST"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.incident.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Incident not found");
    if (!existing.aiCategory || !existing.aiPriority) {
      throw new HttpError(400, "No AI suggestion to accept");
    }
    const incident = await prisma.incident.update({
      where: { id: existing.id },
      data: {
        category: existing.aiCategory,
        priority: existing.aiPriority,
        aiAccepted: true,
      },
    });
    await writeAudit({
      userId: req.user!.id,
      action: `Accepted AI classification for ${existing.ticketNumber}`,
      entityType: "Incident",
      entityId: existing.id,
      previousValue: { category: existing.category, priority: existing.priority },
      newValue: { category: incident.category, priority: incident.priority },
      ipAddress: clientIp(req),
    });
    res.json({ incident });
  }),
);
