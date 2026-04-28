# OpsHub — Phase 0 Setup Handoff

This is the work **you** need to do before I can deploy OpsHub. Code is
written and typechecks; deployment is gated on three small things only you
can do.

---

## What is this

OpsHub is the new internal multi-tenant operations console — the planned
PCC2K-built alternative to itmanager.net. Phase 0 = a deployed, SSO-gated,
empty-but-styled landing page that proves the whole pipeline works (DNS →
nginx → container → DB → Entra SSO). Phase 1 onward fills in actual
features.

Plan reference: `~/.claude/plans/can-you-take-a-swirling-micali.md`

---

## Step 1 — Add a DNS A record

Add `opshub.pcc2k.com` pointing to the same public IP as the other
`*.pcc2k.com` sister apps (currently `153.66.120.215` per the most recent
gsgraphics/mulchparts deployments).

Do this in whatever registrar/DNS console you used for `gsgraphics`. TTL
~14400 is fine (matches the other records). Once propagated everywhere
that matters, we're good.

Verify with: `dig +short opshub.pcc2k.com` — should return the public IP.

---

## Step 2 — Add a redirect URI to the existing PCC2K SSO Entra app

OpsHub piggybacks on DocHub's existing Entra app registration (the one
whose IDs are in the `AZURE_AD_*` env vars on the DocHub container). Add
one redirect URI to it:

1. <https://entra.microsoft.com> → *Identity → Applications → App
   registrations* → click the existing PCC2K SSO app (the same one DocHub
   uses).
2. **Authentication → Redirect URIs → Add URI**:
   - Platform: **Web**
   - URI: `https://opshub.pcc2k.com/api/auth/callback/azure-ad`
3. **Save**.

> Do NOT make a new app reg for OpsHub — keep it on the same one as DocHub.
> The `IDENTITY-SETUP.md` we did earlier IS for a separate (multi-tenant)
> app; this is the *internal staff SSO* app, which is single-tenant for
> PCC2K and shared across staff-facing tools.

---

## Step 3 — Hand back env values + add yourself to the OpsHub allowlist

I'll need three env values + an entry in the OpsHub `op_staff_users` table
(I'll insert that for you when I deploy — just need to know your email).

Drop these in chat or in `~/opshub/.env`:

```
# Same values as DocHub uses:
AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=

# Generate fresh:
NEXTAUTH_SECRET=$(openssl rand -base64 32)
OP_BFF_SECRET=$(openssl rand -hex 32)
OP_BFF_SECRET_DH=$(openssl rand -hex 32)
OPSHUB_AGENT_SECRET=$(openssl rand -hex 32)

# Database (use existing dochub Postgres password):
DATABASE_URL=postgresql://dochub:<existing-dochub-password>@db:5432/dochub?schema=opshub
```

The Entra IDs and the dochub Postgres password are already on this box —
I can grab them myself if you'd rather just say "go." Just want explicit
permission to copy them into a new app's `.env`.

---

## What I'll do once you've done Steps 1-3

1. `npm ci && npm run build` inside `~/opshub/app` to populate node_modules
   and verify the build (should already work — file structure is mirrored
   from DocHub).
2. `prisma db push` to create the four `opshub.*` tables in the shared
   dochub Postgres (additive — does not touch DocHub or TicketHub tables).
3. Insert your email into `op_staff_users` so SSO actually lets you in.
4. `docker compose build && docker compose up -d` from `~/opshub/` —
   container joins the existing `dochub_default` network and listens on
   `:3010`.
5. Copy `~/opshub/nginx-vhost.conf` to `100.91.194.83` as
   `/etc/nginx/sites-available/opshub`, symlink into `sites-enabled`,
   `nginx -t && reload`, then `certbot --nginx -d opshub.pcc2k.com` for
   the Let's Encrypt cert. Mirrors the gsgraphics + mulchparts deployments
   from the last 48 hours — same playbook.
6. You sign in at <https://opshub.pcc2k.com>, see the Phase 0 landing
   page with your email in the header. That's the Phase 0 verification.

---

## What it'll look like

```
┌────────────────────────────────────────────────────────────────────┐
│ OpsHub  [Phase 0 — scaffold]                msaville.pcc2k@…  Sign out
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Welcome to OpsHub                                                │
│   Multi-tenant IT operations console for PCC2K — Phase 0 scaffold. │
│                                                                    │
│   ┌─────────────────────────────┐  ┌─────────────────────────────┐ │
│   │ Phase 1 — M365 admin   pending│  │ Phase 2 — On-prem agent  pending│ │
│   │ Mailboxes, distribution …   │  │ Cross-platform Go agent …   │ │
│   └─────────────────────────────┘  └─────────────────────────────┘ │
│   ┌─────────────────────────────┐  ┌─────────────────────────────┐ │
│   │ Phase 3 — Monitoring   pending│  │ Phase 4 — Remote access pending│ │
│   │ Per-client uptime checks …  │  │ In-browser RDP/VNC/SSH …    │ │
│   └─────────────────────────────┘  └─────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

That's the deliverable for Phase 0. Confirms SSO, DB, container, DNS,
TLS, and the styling system all work end-to-end before we put real
features on top.

---

## Cost / blast-radius reminder

- Phase 0 makes zero outbound network calls to anything except the dochub
  Postgres and the Entra login flow. No Graph access yet.
- Phase 0 has zero ability to mutate DocHub or TicketHub data (no BFF
  connections wired up — the helpers exist but no caller invokes them).
- The new schema additions are isolated to `opshub.*`. Drop them with
  `DROP SCHEMA opshub CASCADE` if you ever need to undo.
