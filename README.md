# SecureAI

AI-powered IT incident intelligence and security analytics. Incidents flow through REST APIs, PostgreSQL, a threat/risk engine, and an AI classification layer before landing on an analyst dashboard with explainable scores.

```
Incident → Security analysis → AI classification → Risk score → SQL analytics → Dashboard → Recommended action
```

AI is part of the decision workflow, not a chatbot. Analysts accept or override every suggestion.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React, Tailwind CSS, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | JWT in HTTP-only cookies, bcrypt, RBAC |
| AI | Deterministic rules + optional Gemini/OpenAI |

## Run locally

1. Start PostgreSQL:

```bash
docker compose up -d
```

2. Install, migrate, seed, and start both apps:

```bash
npm install
cd backend && npx prisma migrate dev --name init && npm run prisma:seed && cd ..
npm run dev
```

- API: http://localhost:4000
- UI: http://localhost:5173

## Demo accounts

Password for all: `SecureAI!123`

| Email | Role |
| --- | --- |
| admin@secureai.dev | Admin — all incidents + analytics + audit |
| security@secureai.dev | Security analyst — high-risk / security queue + audit |
| it@secureai.dev | IT analyst — operational queue + dashboards |
| employee@secureai.dev | Employee — create and view own tickets |

## AI in the workflow

1. **Classification** — category, priority, confidence; analyst can accept or edit.
2. **Risk assessment** — score 0–100 with a **Why?** factor panel (explainable, not a black box).
3. **Root-cause suggestion** — plus linked historical tickets (e.g. INC-1023 / INC-1178 / INC-1241).
4. **Resolution recommendation** — labeled *AI-generated recommendation — analyst verification required*.

Optional LLM: set `GEMINI_API_KEY` or `OPENAI_API_KEY` in `backend/.env` and `AI_PROVIDER=gemini` or `openai`. Without keys, the rules engine still classifies and scores.

## Security controls

- JWT + HTTP-only cookies, password hashing, session cookie expiry
- RBAC: Admin, Security Analyst, IT Analyst, Employee
- Input validation (Zod), rate limiting, Helmet headers
- Parameterized queries via Prisma
- Audit log of privileged incident and auth actions

## Deploy sketch

Frontend → Vercel · Backend → Render/Railway · Database → Neon · AI → Gemini/OpenAI API
