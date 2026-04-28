# OpsHub

PCC2K's internal multi-tenant operations console — the "single pane of glass"
for help-desk-style M365 admin actions across every consenting client tenant.

**Status:** Phase 0 LIVE at <https://opshub.pcc2k.com> as of 2026-04-28.

## What it does (at maturity)

- Per-client Microsoft 365 / Entra admin: reset password, wipe MFA, revoke
  sign-in sessions, manage groups + distribution lists, set OoO, query
  sign-in logs, view license assignments
- Audit log for every privileged action (who, what, which client, when, result)
- Plugs into the rest of the PCC2K stack: TicketHub for client-list +
  invoicing, DocHub for asset references, Portal for client-IT-staff view

## What it does NOT do

OpsHub is the **per-user, per-tenant** console. The **per-host, per-fleet**
operations (patch rollout, software inventory, run-this-script-on-200-hosts)
live in [FleetHub](https://github.com/michaelsaville/fleethub) — sister
project, shared agent.

## Architecture

- **Web app:** Next.js 16 + Prisma 6 + NextAuth 4 + Tailwind 4. Standalone
  Docker output, deployed on host port `:3010`.
- **Database:** shares the dochub Postgres instance via the `opshub` schema.
  Five tables (`op_staff_users`, `op_audit_log`, `op_agents`,
  `op_monitor_checks`, `op_alert_rules`).
- **SSO:** the existing PCC2K single-tenant Entra app — same staff who can
  reach DocHub can reach OpsHub, gated by a per-app `op_staff_users`
  allowlist so OpsHub access can diverge from DocHub access.
- **M365 admin (Phase 1+):** uses the **multi-tenant** PCC2K Identity
  Manager Entra app, which each client tenant admin-consents to once.
  Logic lives in TicketHub (`/api/bff/op/identity/by-name/*`); OpsHub
  calls it via signed BFF (`X-Op-Signature` header, `OP_BFF_SECRET`).

## Phase plan (5–6 months total)

| Phase | Effort | Status |
|-------|--------|--------|
| 0 — Scaffold | 1 week | ✅ LIVE 2026-04-28 |
| 1 — M365 admin surface | 3 weeks | pending |
| 2 — On-prem agent v1 (AD + Windows) | 5–7 weeks | pending |
| 3 — Monitoring + alerts | 3–4 weeks | pending |
| 4 — Remote access (Guacamole) | 4–5 weeks | pending |
| 5 — Polish (Hyper-V, VMware, etc.) | ongoing | pending |

Phase 2's agent is **shared with FleetHub** — same binary, two
namespaces of methods.

## Local development

```bash
cd app
npm install
npx prisma generate
npm run dev
```

A dev `.env` matching `.env.example` is required. For a production deploy
on the PCC2K server, see `OPSHUB-SETUP.md` — covers DNS, Entra redirect URI,
secret values, and the full deploy playbook.

## Sister apps

OpsHub is part of the PCC2K `*Hub` family. Sister apps (open-source where
applicable):

- [DocHub](https://github.com/michaelsaville/dochub) — MSP doc platform
- [TicketHub](https://github.com/michaelsaville/tickethub) — ticketing,
  billing, invoicing; backend for the Identity feature
- [BizHub](https://github.com/michaelsaville/bizhub) — RFP/grant scanning
- [Portal](https://github.com/michaelsaville/portal) — client-facing portal
- [FleetHub](https://github.com/michaelsaville/fleethub) — sister project,
  per-host fleet management (RMM-shaped)
