# Spark Enterprise — Architecture Sketch

How a company buys Spark once and rolls it out to their whole team — the
Salesforce-style model: one organization, many seats, central admin, shared
data, and customization.

> Status: SKETCH. The data model and backend routes below are scaffolded in
> `/backend`. Frontend admin console and SSO are later phases.

---

## The core idea: organizations (tenants)

Today every user is independent. Enterprise adds an **Organization** that owns
everything:

```
Organization "Acme Corp"  (1 subscription, N seats)
├── Owner        (billing + full control)
├── Admins       (manage members, settings, custom fields)
└── Members      (salespeople — use the app, see shared/assigned clients)
```

A user belongs to an org via a **membership** with a **role**. Org-level
settings (branding, custom fields) apply to everyone in that org.

---

## Roles & permissions

| Capability | Owner | Admin | Member |
|---|:--:|:--:|:--:|
| Use the app (clients, calls, AI) | ✅ | ✅ | ✅ |
| Invite / remove members | ✅ | ✅ | – |
| Edit org settings & custom fields | ✅ | ✅ | – |
| Manage billing & seats | ✅ | – | – |
| Delete the organization | ✅ | – | – |

---

## Seats & licensing

- The org buys **N seats**. Each active member uses one.
- Inviting/accepting a member is blocked when `members >= seats`.
- Billing is **per-seat per-month** via Stripe (quantity = seats). The owner can
  add/remove seats, which updates the Stripe subscription quantity.

---

## Customization (the "make it ours" part)

Stored per-org in `org_settings`:

- **Branding** — company name shown in-app, logo, accent color.
- **Custom fields** — admins define extra client fields (e.g. "Account Tier",
  "Region", "Contract Renewal Date"). Every client form in that org shows them.
- **Templates** (later) — custom AI extraction prompts tuned to their sales process.

---

## Data model (added to the backend)

**organizations**: id, name, plan, seats, owner_id, created_at
**users** (existing): + `org_id`, + `role` (owner|admin|member)
**org_settings**: org_id, branding_json, custom_fields_json
**invites**: id, org_id, email, role, token, created_at

> Client records become **org-scoped** in the enterprise tier (shared within the
> company, with per-member assignment) instead of device-local. That migration
> is the biggest piece of enterprise work — see phases.

---

## Endpoints (scaffolded in `/backend/src/routes/org.js`)

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/orgs` | any | Create an org; creator becomes Owner |
| GET | `/orgs/me` | member | Org details, members, settings |
| POST | `/orgs/invite` | admin+ | Invite a member (returns an invite link) |
| POST | `/orgs/accept` | any (auth) | Join an org via invite token |
| PATCH | `/orgs/settings` | admin+ | Update branding + custom fields |
| PATCH | `/orgs/seats` | owner | Change seat count (→ Stripe quantity) |
| POST | `/orgs/members/:id/role` | admin+ | Change a member's role |

---

## SSO / SAML (later)

Big customers want "log in with our company account" (Okta, Google Workspace,
Azure AD). That's a Phase 3 add via SAML/OIDC — significant but well-trodden.

---

## Build phases

1. **Org foundation** — orgs, memberships, roles, invites, seat checks. *(scaffolded)*
2. **Shared client data** — move client records server-side, org-scoped, with
   assignment + visibility rules. (Biggest lift.)
3. **Customization UI** — admin console for branding + custom fields, applied in the app.
4. **Enterprise billing** — per-seat Stripe subscriptions, seat management.
5. **SSO/SAML + audit logs + advanced permissions.**

---

## Pricing

- **Premium $4.99** / **Platinum $11.99** — individuals & small teams (existing).
- **Enterprise — custom** — per-seat, annual contracts, SSO, custom fields,
  shared data, priority support. "Contact sales" in-app.
