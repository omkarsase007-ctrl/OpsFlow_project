# OpsFlow: Known Limitations & Future Architecture Roadmap

This document clearly distinguishes between features implemented in the current production-grade submission and architectural extensions planned for larger enterprise scale.

---

## 1. Currently Implemented Features (Verified in Code & Tests)

| Feature | Implementation Details | Status |
| :--- | :--- | :--- |
| **Optimistic Concurrency Control (OCC)** | Version-checked atomic conditional updates (`WHERE id = ? AND version = ?`), HTTP 409 conflict responses, client-side conflict resolution banner with diff inspection. | **Complete & Tested** |
| **Atomic Claim / Mutual Exclusion** | Conditional assignment on unassigned records (`assigneeId IS NULL`), preventing duplicate work allocation. | **Complete & Tested** |
| **Idempotency Keys** | Safe client retries without duplicate record creation or side effects via `IdempotencyRecord` table. | **Complete & Tested** |
| **State Machine Lifecycle Enforcement** | Directed graph transition matrix (`OPEN` → `IN_PROGRESS` → `IN_REVIEW` → `RESOLVED` → `CLOSED`), role restrictions on reopening closed items. | **Complete & Tested** |
| **Dual-Authorization Approval Workflow** | Explicit sign-off required for compliance/wire items; only designated Team Lead or Administrator can approve. | **Complete & Tested** |
| **Resource-Level Team Authorization** | Strict cross-team isolation preventing unauthorized users from modifying foreign department items. | **Complete & Tested** |
| **Transactional Append-Only Audit Trail** | Atomic `$transaction` commits for all mutations writing to `ActivityLog` with metadata diffs. | **Complete & Tested** |
| **Server-Side Search & Pagination** | Database-level filtering, multi-field search, indexed sorting, and paginated responses. | **Complete & Tested** |
| **Overview Dashboard & Metrics** | Real database-derived aggregations for active, critical, blocked, overdue, and pending approval items. | **Complete & Tested** |
| **Persona & Role Switcher** | Instant switching between Admin, Team Lead, and Member personas for seamless interview verification. | **Complete & Tested** |

---

## 2. Known Limitations & Planned Extensions

### 1. Keyset / Cursor-Based Pagination for Massive Scale
- **Current Behavior**: Uses SQL `OFFSET` and `LIMIT` (`skip` and `take`), which performs with sub-50ms latency up to tens of thousands of records.
- **Future Scale Limitation**: For databases with millions of rows, high offsets (e.g. `OFFSET 100000`) induce storage engine scans.
- **Planned Solution**: Transition to cursor-based pagination (`WHERE id > :cursor LIMIT 20`) using the item's `updatedAt` and `id` composite index.

### 2. Push Notifications & Real-Time Sync (WebSockets / SSE)
- **Current Behavior**: The UI updates upon user action, reloads, or navigation, and alerts on concurrency conflicts upon save.
- **Future Scale Limitation**: If User B modifies an item while User A is actively viewing it, User A is notified when they attempt to save or refresh, rather than via a live cursor notification.
- **Planned Solution**: Introduce Server-Sent Events (SSE) or a lightweight WebSocket gateway (e.g. via Redis Pub/Sub) to broadcast live presence badges ("User B is viewing this item") and background updates.

### 3. Distributed Task Queue for Asynchronous Operations
- **Current Behavior**: Operations are performed synchronously inside ACID database transactions.
- **Deliberate Design Decision**: As stated in Section 10 of the brief: *"Do not add a queue merely to make the architecture appear sophisticated."* Critical state changes and audit logging must be committed atomically together.
- **Planned Solution**: For secondary operations like sending outbound emails, PagerDuty webhook dispatches, or Slack alerts, an Outbox Pattern with a durable worker queue (e.g., BullMQ or Temporal) would be attached to consume committed `ActivityLog` events without adding latency to the primary write path.

### 4. Full-Text Search Engine
- **Current Behavior**: Substring matching (`LIKE` / `contains`) over `key`, `title`, and `description`.
- **Future Scale Limitation**: Does not support linguistic stemming, fuzzy typo-tolerance, or relevance ranking.
- **Planned Solution**: Enable PostgreSQL `tsvector` with GiST/GIN indexes or attach an external search cluster (Elasticsearch / Meilisearch) for fuzzy enterprise search.

### 5. Multi-File Attachments & Artifact Storage
- **Current Behavior**: Rich text descriptions and comment threads are stored directly in the database.
- **Planned Solution**: S3 / Cloud Storage pre-signed URL upload pipeline for attaching screenshots, log bundles, and compliance PDFs directly to work items.
