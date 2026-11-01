import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

export const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.use(requireRoles("ADMIN", "SECURITY_ANALYST"));

auditRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    res.json({ logs });
  }),
);
