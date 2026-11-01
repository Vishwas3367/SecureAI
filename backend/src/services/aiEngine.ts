import type { Category, Priority } from "@prisma/client";
import { config } from "../config.js";
import { analyzeSecurityRisk, type RiskBreakdown } from "./securityEngine.js";

export type Classification = {
  category: Category;
  priority: Priority;
  confidence: number;
  rationale: string;
};

export type RootCauseResult = {
  rootCause: string;
  confidence: number;
  recommendedResolution: string;
};

export type AiAnalysis = {
  classification: Classification;
  risk: RiskBreakdown;
  rootCause: RootCauseResult;
  source: "rules" | "llm+rules";
};

type AnalyzeInput = {
  title: string;
  description: string;
  sourceIp?: string | null;
  sourceGeo?: string | null;
  affectedAccounts?: number | null;
  afterHours?: boolean | null;
  relatedTitles?: string[];
};

const CATEGORY_RULES: { category: Category; patterns: RegExp[]; boost: number }[] = [
  { category: "SECURITY", patterns: [/phish/, /malware/, /ransomware/, /failed login/, /brute force/, /credential/, /unauthorized/, /ids /, /firewall alert/], boost: 0.35 },
  { category: "ACCESS", patterns: [/cannot access/, /locked out/, /password reset/, /sso/, /okta/, /vpn/, /mfa/, /login/], boost: 0.3 },
  { category: "APPLICATION", patterns: [/portal/, /application/, /500 error/, /bug/, /ui /, /web app/], boost: 0.22 },
  { category: "NETWORK", patterns: [/network/, /dns/, /wifi/, /latency/, /packet/, /switch/, /router/], boost: 0.22 },
  { category: "DATABASE", patterns: [/database/, /sql/, /query/, /replication/, /postgres/, /oracle/], boost: 0.25 },
  { category: "EMAIL", patterns: [/email/, /outlook/, /exchange/, /mailbox/], boost: 0.25 },
  { category: "INFRASTRUCTURE", patterns: [/server/, /cpu/, /disk/, /outage/, /kubernetes/, /cloud/, /certificate/], boost: 0.22 },
  { category: "HARDWARE", patterns: [/laptop/, /printer/, /monitor/, /keyboard/, /badge reader/], boost: 0.2 },
];

export function classifyIncident(title: string, description: string): Classification {
  const text = `${title} ${description}`.toLowerCase();
  let best: { category: Category; score: number } = { category: "OTHER", score: 0.35 };

  for (const rule of CATEGORY_RULES) {
    const hits = rule.patterns.filter((p) => p.test(text)).length;
    if (!hits) continue;
    const score = Math.min(0.97, 0.55 + hits * 0.12 + rule.boost);
    if (score > best.score) best = { category: rule.category, score };
  }

  let priority: Priority = "MEDIUM";
  if (/ransomware|data leak|production down|all users|security breach/.test(text)) {
    priority = "CRITICAL";
  } else if (/cannot access|outage|failed login|multiple employees|high volume/.test(text)) {
    priority = "HIGH";
  } else if (/slow|intermittent|one user|request/.test(text)) {
    priority = "LOW";
  }

  if (best.category === "SECURITY" && priority === "LOW") priority = "HIGH";

  const rationale =
    best.category === "OTHER"
      ? "No strong domain keywords; defaulted to a general operational category."
      : `Matched ${best.category.toLowerCase()} language in the incident narrative.`;

  return {
    category: best.category,
    priority,
    confidence: Number(best.score.toFixed(2)),
    rationale,
  };
}

export function suggestRootCause(input: AnalyzeInput, classification: Classification): RootCauseResult {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const related = input.relatedTitles ?? [];

  if (/failed login|brute force|credential/.test(text)) {
    return {
      rootCause: "Credential stuffing or password-spray activity against the authentication service.",
      confidence: 0.86,
      recommendedResolution: [
        "1. Verify source IP reputation and geo.",
        "2. Identify and lock or force-reset affected accounts.",
        "3. Temporarily restrict suspicious activity at the WAF / IdP.",
        "4. Review authentication logs for additional compromised identities.",
      ].join("\n"),
    };
  }

  if (/certificate|tls|ssl/.test(text) || /expired authentication service certificate/i.test(related.join(" "))) {
    return {
      rootCause: "Expired authentication service certificate.",
      confidence: 0.84,
      recommendedResolution: [
        "1. Verify authentication service status.",
        "2. Check certificate expiration on the IdP / reverse proxy.",
        "3. Renew and reload the certificate; restart the auth service if required.",
        "4. Validate login functionality for a sample of users.",
      ].join("\n"),
    };
  }

  if (/hr portal|cannot access/.test(text) && classification.category === "ACCESS") {
    return {
      rootCause: "Identity provider or application entitlement failure affecting a shared portal.",
      confidence: 0.78,
      recommendedResolution: [
        "1. Confirm SSO / IdP health and recent config changes.",
        "2. Check application entitlements for the HR portal.",
        "3. Review error rates on the reverse proxy.",
        "4. Communicate a workaround if a secondary access path exists.",
      ].join("\n"),
    };
  }

  if (classification.category === "NETWORK") {
    return {
      rootCause: "Network path degradation (DNS, routing, or firewall policy change).",
      confidence: 0.72,
      recommendedResolution: [
        "1. Check DNS resolution and recent firewall change tickets.",
        "2. Traceroute from an affected site.",
        "3. Fail over if a redundant path is available.",
        "4. Capture packet loss metrics before closing.",
      ].join("\n"),
    };
  }

  return {
    rootCause: "Insufficient telemetry to pinpoint a single cause; treat as a service degradation pending log review.",
    confidence: 0.61,
    recommendedResolution: [
      "1. Collect application, auth, and infrastructure logs for the incident window.",
      "2. Compare with similar historical tickets.",
      "3. Restore service via standard runbook.",
      "4. Record the confirmed cause before closing.",
    ].join("\n"),
  };
}

async function tryLlmClassification(input: AnalyzeInput): Promise<Partial<Classification> | null> {
  const prompt = `Classify this IT incident. Return JSON only with keys category (ACCESS|APPLICATION|NETWORK|INFRASTRUCTURE|SECURITY|HARDWARE|EMAIL|DATABASE|OTHER), priority (LOW|MEDIUM|HIGH|CRITICAL), confidence (0-1), rationale.
Title: ${input.title}
Description: ${input.description}`;

  try {
    if (config.openaiApiKey && (config.aiProvider === "openai" || config.aiProvider === "llm")) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.1,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return parseJsonBlob(data.choices?.[0]?.message?.content ?? "");
    }

    if (config.geminiApiKey && (config.aiProvider === "gemini" || config.aiProvider === "llm")) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return parseJsonBlob(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
    }
  } catch {
    return null;
  }
  return null;
}

function parseJsonBlob(text: string): Partial<Classification> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Partial<Classification>;
  } catch {
    return null;
  }
}

export async function runAiAnalysis(input: AnalyzeInput): Promise<AiAnalysis> {
  const rulesClassification = classifyIncident(input.title, input.description);
  const llm = await tryLlmClassification(input);
  let source: AiAnalysis["source"] = "rules";
  let classification = rulesClassification;

  if (llm?.category && llm.priority) {
    source = "llm+rules";
    classification = {
      category: llm.category as Category,
      priority: llm.priority as Priority,
      confidence: Number(llm.confidence ?? rulesClassification.confidence),
      rationale: llm.rationale ?? rulesClassification.rationale,
    };
  }

  const risk = analyzeSecurityRisk({
    title: input.title,
    description: input.description,
    category: classification.category,
    priority: classification.priority,
    sourceIp: input.sourceIp,
    sourceGeo: input.sourceGeo,
    affectedAccounts: input.affectedAccounts,
    afterHours: input.afterHours,
    relatedCount: input.relatedTitles?.length ?? 0,
  });

  const rootCause = suggestRootCause(input, classification);
  return { classification, risk, rootCause, source };
}
