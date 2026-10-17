# OpsFlow: Engineering Decisions & Architectural Trade-offs

This document details five foundational engineering decisions made while building **OpsFlow: Operations Under Pressure**. For each decision, we outline the problem, the chosen approach, the justification, trade-offs, and considered alternatives.

---

## Decision 1: Relational Data Modeling & Multi-Tier Entity Constraints

### 1. The Problem
An operations management platform involves complex relationships between actors, teams, work items, and approval chains. In an environment with hundreds of concurrent users, weak data integrity leads to orphan tickets, phantom assignees, unlinked approval decisions, and broken audit histories.

### 2. The Chosen Approach
We implemented a strict relational model using Prisma ORM with explicit referential integrity and database constraints:
- **Keys & Identifiers**: Work items have a machine-friendly CUID primary key (`id`) and a human-friendly sequential business key (`key`, e.g., `OPS-1001`) with a `@unique` constraint.
- **Foreign Key Actions**:
  - `Team` → `WorkItem` uses `onDelete: Cascade`.
  - `User` → `WorkItem` (assignee) uses `onDelete: SetNull` so departed employees do not delete historical operations.
  - `User` → `WorkItem` (creator) uses `onDelete: Cascade`.
  - `WorkItem` → `ActivityLog` and `Comment` use `onDelete: Cascade`.
- **Database Composite Indexes**:
  - `@@index([teamId, status])` for fast team queue filtering.
  - `@@index([assigneeId, status])` for fast personal work item lookups.
  - `@@index([priority, updatedAt])` for SLA prioritization queries.
  - `@@index([status, priority])` for executive overview metrics.

### 3. Why It Was Chosen
Relational models provide declarative consistency at the database engine level. This guarantees that invalid states (such as an item assigned to a non-existent user or an unindexed table scan) cannot occur even if application code is refactored.

### 4. Trade-offs
- **Schema Migration Rigidity**: Schema changes require formal migrations.
- **Normalization Overhead**: Deep queries require SQL joins, which we mitigate through targeted Prisma `include` blocks selecting only necessary fields.

### 5. Alternatives Considered
- **Document / NoSQL Store (e.g. MongoDB)**: Would offer flexible document structures for custom metadata fields, but lacks declarative relational integrity, atomic cross-document transactions under high concurrency, and standardized referential cascades.
- **Generic Key-Value Metadata (`jsonb` for all fields)**: Would allow ad-hoc attributes without schema updates, but prevents database-level indexing and type-safe query guarantees.

---

## Decision 2: Multi-Dimensional Authorization Strategy (RBAC + Resource Boundaries)

### 1. The Problem
Relying solely on frontend UI hiding for permissions is an acute security vulnerability. In an enterprise operational setting, an employee in Customer Support should not be able to modify internal payment ledger reconciliations or approve high-value wire transfers, even if they craft direct API requests.

### 2. The Chosen Approach
We enforced authorization strictly at the backend service layer (`validateTeamAccess`, `validateApprovalPermission`, `validateStatusTransition`):
- **Role Tiering**:
  - `MEMBER`: Can create items, view permitted team items, comment, and transition tickets assigned to their team.
  - `TEAM_LEAD`: Has management authority over their designated team's queues, assignments, approvals, and reopening closed items.
  - `ADMIN`: Global bypass authority across all teams and system-wide overrides.
- **Resource-Level Validation**:
  Every mutation handler verifies `user.teamId === item.teamId` or `user.role === 'ADMIN'`. If violated, the backend immediately throws `AuthorizationError` returning **HTTP 403 Forbidden**.
- **Server Identity Integrity**:
  The user identity is extracted from an authenticated HTTP-only session cookie (`opsflow_session_user`) validated against the database on every request. Client-supplied role or user IDs are never trusted.

### 3. Why It Was Chosen
Enforcing authorization in reusable service functions ensures identical security policies apply whether invoked via REST endpoints, server actions, or automated integration test suites.

### 4. Trade-offs
- Requires database lookups on authenticated requests to fetch current user permissions. Mitigated by caching session identity in cookie/memory.

### 5. Alternatives Considered
- **Pure Role-Based Access Control (RBAC without resource checking)**: Allows any "Member" to edit any ticket in the company. Rejected because operational sensitivity requires team isolation.
- **Attribute-Based Access Control (ABAC / Policy Engine like OPA)**: Extremely expressive, but introduces external network dependencies and complexity unnecessary for a company with tens of teams.

---

## Decision 3: Optimistic Concurrency Control (OCC) with Versioning & Atomic Claims

### 1. The Problem
When multiple operators work under pressure, simultaneous actions create race conditions:
1. **Lost Update Problem**: User A and User B open a ticket simultaneously. User A edits the description; User B edits the status. User B's save silently overwrites User A's changes.
2. **Conflicting Claim Problem**: Two operators click "Claim" on an unassigned critical incident at the same second, resulting in duplicate effort or inconsistent assignment records.

### 2. The Chosen Approach
We implemented **Optimistic Concurrency Control (OCC)** combined with **Atomic Mutual-Exclusion Updates**:
- **Versioning**: Every work item table contains an integer `version` field starting at 1.
- **Conditional CAS Update**:
  ```sql
  UPDATE "WorkItem"
  SET "title" = :title, "version" = "version" + 1
  WHERE "id" = :id AND "version" = :submittedVersion;
  ```
- **Conflict Handling**:
  If another user has incremented the version, the atomic condition matches 0 rows. The backend detects this and throws `ConcurrencyConflictError` (HTTP 409 Conflict), returning the latest server data.
- **Atomic Claim with Idempotency**:
  Claiming checks `assigneeId IS NULL`. Only the first concurrent request claims the ticket; the second receives HTTP 409 ("Already claimed by [User]"). Idempotency keys (`IdempotencyRecord`) ensure client retries do not trigger duplicate mutations.

### 3. Why It Was Chosen
Pessimistic locking (`SELECT FOR UPDATE`) causes database locks and worker pool starvation when users keep detail modals open while reading. OCC allows boundless read scalability and resolves conflicts deterministically at commit time.

### 4. Trade-offs
- Users who encounter a conflict must be presented with conflict feedback and a reload action. We designed a clear conflict banner in the UI showing current server values and a one-click reload button.

### 5. Alternatives Considered
- **Last-Write-Wins (LWW)**: Silently overwrites changes. Unacceptable in critical operations where incident notes or status updates would be lost.
- **Pessimistic Row-Level Locks**: Holds database connections open while users edit forms. Fails under enterprise scale with hundreds of concurrent users.
- **Operational Transformation (OT) / CRDTs**: Excellent for real-time collaborative rich-text editing (Google Docs), but excessive and unpredictable for structured workflow status transitions.

---

## Decision 4: Append-Only Activity Log & Transactional Integrity

### 1. The Problem
In an operations platform, "What happened, who did it, and when?" is paramount for compliance and post-mortems. If a work item update succeeds but the audit log write fails (or vice versa), auditability is compromised. Furthermore, allowing users to edit or delete history ruins data integrity.

### 2. The Chosen Approach
- **Append-Only Table**: `ActivityLog` records every event (`CREATED`, `ASSIGNED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `APPROVED`, `REJECTED`, `COMMENT_ADDED`).
- **Transactional Atomicity (`$transaction`)**:
  All work item state changes and their corresponding `ActivityLog` records are wrapped in a single database transaction. If the log write fails, the entire change rolls back.
- **Immutability Guarantee**:
  No `UPDATE` or `DELETE` endpoints exist for `ActivityLog`. Normal users cannot alter previous logs.
- **Metadata Diffing**:
  Stores JSON diffs (e.g. `{ "from": "OPEN", "to": "IN_PROGRESS" }`) allowing exact state reconstructions.

### 3. Why It Was Chosen
Guarantees ACID compliance: the system cannot reach a state where a ticket's status has changed but no activity record exists.

### 4. Trade-offs
- Activity table grows faster than the work item table. Mitigated by composite indexing on `(workItemId, createdAt)`.

### 5. Alternatives Considered
- **Asynchronous Message Queue for Audit Logging (e.g. Kafka/RabbitMQ)**: Decouples logging from the write path, but introduces eventual consistency where an audit record could lag behind the item state or be lost if the message broker drops packets.
- **Database Triggers**: Database-level triggers are database-engine specific, difficult to unit-test in standard codebases, and cannot easily capture application-level user context without session-variable hacking.

---

## Decision 5: Server-Side Search, Pagination, and Query Efficiency

### 1. The Problem
An operations system at scale manages tens of thousands of work items. Fetching all records into the browser to filter in JavaScript degrades network bandwidth, exhausts client memory, and fails completely on mobile devices.

### 2. The Chosen Approach
- **Database-Level Pagination**:
  Using SQL `LIMIT` (`take`) and `OFFSET` (`skip`). The client only receives the active page (default 10 items).
- **Server-Side Filtering**:
  Filters for `status`, `priority`, `type`, `teamId`, and `assigneeId` compile into targeted parameterized SQL `WHERE` clauses executed directly on indexed columns.
- **Multi-Field Substring Search**:
  Case-insensitive substring search matching item `key`, `title`, and `description` concurrently.
- **Aggregate Overview Queries**:
  The dashboard executes 6 targeted `count()` queries in parallel (`Promise.all`), avoiding unnecessary row materialization.

### 3. Why It Was Chosen
Keeps the First Load JS bundle lightweight (~99 kB) and guarantees sub-50ms API response times regardless of whether the database contains 10 items or 50,000 items.

### 4. Trade-offs
- `OFFSET` pagination on extremely large datasets (e.g. page 10,000) requires scanning earlier rows. For future scale beyond 500,000 items, cursor-based keyset pagination (`WHERE id > :lastId`) would be adopted.

### 5. Alternatives Considered
- **Client-Side Slicing**: Fetching the entire database table as a JSON array and filtering with `Array.prototype.filter`. Unacceptable for enterprise scale.
- **External Search Cluster (Elasticsearch/Typesense)**: Outstanding for fuzzy search and typo tolerance, but adds infrastructure management overhead and synchronization latency for a localized challenge.
