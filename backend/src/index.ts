import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { incidentRouter } from "./routes/incidents.js";
import { analyticsRouter } from "./routes/analytics.js";
import { auditRouter } from "./routes/audit.js";
import { userRouter } from "./routes/users.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many authentication attempts" },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "secureai-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/incidents", incidentRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/users", userRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`SecureAI API listening on http://localhost:${config.port}`);
});
