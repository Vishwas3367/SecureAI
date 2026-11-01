import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { clientIp, writeAudit } from "../lib/audit.js";

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get(
  "/",
  requireRoles("ADMIN", "IT_ANALYST", "SECURITY_ANALYST"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
    });
    res.json({ users });
  }),
);

const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["ADMIN", "SECURITY_ANALYST", "IT_ANALYST", "EMPLOYEE"]),
  department: z.string().max(80).optional(),
});

userRouter.post(
  "/",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash,
        role: body.role,
        department: body.department,
      },
      select: { id: true, name: true, email: true, role: true, department: true },
    });
    await writeAudit({
      userId: req.user!.id,
      action: `Created user ${user.email}`,
      entityType: "User",
      entityId: user.id,
      newValue: { role: user.role },
      ipAddress: clientIp(req),
    });
    res.status(201).json({ user });
  }),
);
