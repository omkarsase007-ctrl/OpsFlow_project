# OpsFlow: Operations Under Pressure

> **Newtonite Software Engineering Challenge Deliverable**  
> An internal operations management platform built to coordinate high-stakes incidents, investigations, approvals, and team workflows under concurrent enterprise pressure.

---

## 1. Project Purpose

OpsFlow replaces chaotic ad-hoc communication (chat channels, spreadsheets, email threads) with a structured, auditable operations platform. Built for rapidly growing companies with hundreds of employees and tens of thousands of active operations, OpsFlow is designed around three fundamental questions:

1. **What requires attention now?** (Critical incidents, blocked items, SLA expirations, pending approvals)
2. **Who is responsible for it?** (Clear team ownership, individual assignees, and atomic unassigned claims)
3. **What has happened, and what should happen next?** (Append-only chronological audit logs and policy-governed workflow transitions)

---

## 2. Technology Stack

- **Framework**: Next.js 14 (App Router) with React 18 & TypeScript (strict type checking enabled)
- **Database & ORM**: SQLite (default for zero-dependency local execution) or PostgreSQL via Prisma ORM
- **Styling**: Tailwind CSS with an enterprise design system (clean typography, subtle borders/shadows, accessible status badges, restrained color contrast)
- **Icons**: Lucide React
- **Validation**: Zod schema validation on all inputs and API endpoints
- **Testing**: Vitest automated integration suite covering all 7 core correctness behaviors

---

## 3. Architecture Overview

OpsFlow enforces strict separation of concerns across clean architectural boundaries:

```
┌────────────────────────────────────────────────────────┐
│                   UI & Pages Layer                     │
│  (Overview Dashboard, Work Table, Details, Approvals)   │
└──────────────────────────┬─────────────────────────────┘
                           │ Typed HTTP / Server Requests
┌──────────────────────────▼─────────────────────────────┐
│                 API & Route Handlers                   │
│   (Zod Validation, HTTP Status Codes, Cookie Session)  │
└──────────────────────────┬─────────────────────────────┘
                           │ Strongly Typed DTOs
┌──────────────────────────▼─────────────────────────────┐
│                 Business Service Layer                 │
│  - Optimistic Concurrency Control (OCC) Engine         │
│  - Atomic Mutual-Exclusion Claim Service               │
│  - State Machine & Workflow Policy Validator           │
│  - Resource-Level Team Authorization Guard             │
└──────────────────────────┬─────────────────────────────┘
                           │ Prisma $transaction
┌──────────────────────────▼─────────────────────────────┐
│                 Persistent Database                    │
│   (WorkItems, Users, Teams, Comments, ActivityLog)     │
└────────────────────────────────────────────────────────┘
```

---

## 4. Key Correctness Behaviours

### A. Optimistic Concurrency Control (OCC)
- Every work item maintains an integer `version` field.
- When an update request arrives, the client sends its known version.
- The backend evaluates `WHERE id = ? AND version = submittedVersion` inside an atomic transaction.
- If another user updated the record in the meantime, the server rejects the stale update with **HTTP 409 Conflict**, preserves the newer server data, and provides conflict diff metadata with an inline reload action.

### B. Atomic Claim & Mutual Exclusion
- When multiple team members attempt to claim an unassigned work item simultaneously, an atomic conditional update guarantees **exactly one user succeeds**.
- The second user receives an immediate **HTTP 409 Conflict** ("Already claimed by [User]").
- Supported by **Idempotency Keys** to prevent duplicate side effects on network retries.

### C. State Machine & Approval Enforcement
- Transitions follow a strict directed graph (`OPEN` → `IN_PROGRESS` → `IN_REVIEW` → `RESOLVED` → `CLOSED`).
- Reopening a `CLOSED` item is strictly restricted to **Team Lead** or **Administrator** roles.
- Items designated as `requiresApproval` **cannot** be marked as Resolved or Closed without prior authorized sign-off.
- Only an **Administrator** or the **Team Lead** of that specific team has permission to approve or reject.

### D. Resource-Level Team Authorization
- Members belonging to Team A cannot modify or claim confidential operational items belonging to Team B unless they possess global Administrator privileges.

### E. Append-Only Transactional Audit Trail
- Every state mutation (creation, claim, status change, priority change, approval, rejection, comment) writes an immutable record to `ActivityLog` inside the **same atomic database transaction** as the item update.

---

## 5. Prerequisites & Environment Setup

- **Node.js**: v18.17.0+ (Tested on v22.16.0)
- **Package Manager**: npm v9+

### Environment Configuration

The application comes pre-configured with a zero-setup SQLite database:

```bash
# Copy example environment configuration
cp .env.example .env
```

Contents of `.env`:
```ini
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="opsflow-super-secret-development-key-32-chars-min"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

*(Note: To switch to PostgreSQL, simply change `DATABASE_URL="postgresql://user:password@localhost:5432/opsflow?schema=public"` and update `provider = "postgresql"` in `prisma/schema.prisma`)*.

---

## 6. Database Setup & Seed Instructions

Push the schema and seed realistic operational data:

```bash
# 1. Generate Prisma Client and sync SQLite database
npm run db:push

# 2. Seed database with teams, personas, incidents, and audit trails
npm run db:seed
```

### Seeded Demo Personas

The application includes pre-configured personas ready for interview demonstration:

| Name | Role | Team | Email |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | `ADMIN` | Core Infrastructure | `sarah.chen@opsflow.internal` |
| **Alex Rivera** | `TEAM_LEAD` | Payments & Settlement | `alex.rivera@opsflow.internal` |
| **Maya Lin** | `MEMBER` | Payments & Settlement | `maya.lin@opsflow.internal` |
| **Marcus Vance** | `TEAM_LEAD` | Core Infrastructure | `marcus.vance@opsflow.internal` |
| **Elena Rostova** | `TEAM_LEAD` | InfoSec & Compliance | `elena.rostova@opsflow.internal` |
| **James Wilson** | `MEMBER` | Customer Support | `james.wilson@opsflow.internal` |

---

## 7. How to Run the App

Start the Next.js development server:

```bash
npm run dev
```

Open your browser to: **[http://localhost:3000](http://localhost:3000)**

---

## 8. Running Automated Tests

Run the Vitest integration suite:

```bash
npm test
# or
npx vitest run
```

All **14 automated tests** verify the risky correctness behaviors in under 1 second:
1. Work item creation input validation & sequential key generation
2. Rejection on non-existent team
3. Resource-level cross-team authorization enforcement (Support Member forbidden from Payments work)
4. Administrator global permission override
5. Prevention of invalid state transitions (skipping from `OPEN` straight to `RESOLVED`)
6. Closed ticket reopening restrictions (forbidden for Member, allowed for Team Lead)
7. Approval prerequisite enforcement before moving to `RESOLVED`
8. Atomic claim mutual exclusion (second claimant receives 409 Conflict)
9. Idempotent claim retry handling with idempotency keys
10. Optimistic Concurrency Control: stale version rejection (HTTP 409) without overwriting newer data
11. Regular member forbidden from approving sign-offs
12. Cross-team lead forbidden from approving foreign team requests
13. Designated lead and admin approved successfully
14. Append-only transactional activity log persistence

---

## 9. Suggested 5-Minute Interview Demonstration

1. **Overview Dashboard (`/`)**:
   - Point out real database-derived metrics (Total Active, Critical/High, Blocked, Overdue, Awaiting Approval).
   - Show the **Attention Required** feed displaying critical unassigned items.
   - Click the inline **Claim** button on `OPS-1003` to show instant atomic assignment.

2. **Persona Switcher (Top Right)**:
   - Click the user avatar in the top navigation.
   - Switch from **Alex Rivera (Team Lead, Payments)** to **James Wilson (Member, Support)**.
   - Notice how permissions adapt instantly across the UI and backend.

3. **Resource-Level Authorization**:
   - While logged in as **James Wilson (Support)**, try modifying a Payments incident or approving a Payments sign-off.
   - Observe strict backend rejection (HTTP 403 Forbidden).

4. **Optimistic Concurrency Control (OCC)**:
   - Navigate to an active work item like `OPS-1001`.
   - Open the item in two browser tabs.
   - In Tab 1, update the priority to **High** and save (version increments from v3 to v4).
   - In Tab 2 (holding stale v3), attempt to save a change.
   - Observe the prominent **HTTP 409 Concurrency Conflict** banner showing the server state, current version, and "Reload Latest Server Data" button.

5. **Approval Workflow (`/approvals`)**:
   - Switch to **Elena Rostova (Team Lead, Security)** or **Sarah Chen (Admin)**.
   - Review pending approval items (e.g., `OPS-1002: PCI-DSS Annual Audit Evidence`).
   - Click **Approve Sign-off** and observe the status update and immutable activity log entry.

6. **Audit Trail (`/activity`)**:
   - Visit the activity log page to demonstrate the tamper-resistant, append-only history of every operation committed during the demo.
