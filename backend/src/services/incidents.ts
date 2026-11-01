import { prisma } from "../lib/prisma.js";
import type { Category } from "@prisma/client";

export async function nextTicketNumber() {
  const latest = await prisma.incident.findFirst({
    orderBy: { createdAt: "desc" },
    select: { ticketNumber: true },
  });
  const n = latest ? Number(latest.ticketNumber.replace(/\D/g, "")) + 1 : 1001;
  return `INC-${n}`;
}

export function slaHours(priority: string) {
  switch (priority) {
    case "CRITICAL":
      return 2;
    case "HIGH":
      return 8;
    case "MEDIUM":
      return 24;
    default:
      return 72;
  }
}

export async function findRelatedIncidents(title: string, description: string, category: Category, excludeId?: string) {
  const tokens = `${title} ${description}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 4)
    .slice(0, 6);

  if (!tokens.length) return [];

  const candidates = await prisma.incident.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      category,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, ticketNumber: true, title: true, description: true, status: true },
  });

  const scored = candidates
    .map((c) => {
      const hay = `${c.title} ${c.description}`.toLowerCase();
      const hits = tokens.filter((t) => hay.includes(t)).length;
      return { ...c, hits };
    })
    .filter((c) => c.hits >= 2)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3);

  return scored;
}
