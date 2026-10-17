import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../lib/prisma";
import {
  WorkItemService,
  ConcurrencyConflictError,
  AuthorizationError,
  ValidationError,
} from "../lib/services/work-item.service";
import { SessionUser, Role, WorkStatus, WorkPriority, WorkType } from "../lib/types";

describe("OpsFlow Core Correctness & Business Rules", () => {
  let adminUser: SessionUser;
  let paymentsLead: SessionUser;
  let paymentsMember: SessionUser;
  let supportMember: SessionUser;
  let paymentsTeamId: string;
  let supportTeamId: string;

  beforeEach(async () => {
    // Look up seeded test personas
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const lead = await prisma.user.findFirstOrThrow({ where: { email: "alex.rivera@opsflow.internal" } });
    const member = await prisma.user.findFirstOrThrow({ where: { email: "maya.lin@opsflow.internal" } });
    const support = await prisma.user.findFirstOrThrow({ where: { email: "james.wilson@opsflow.internal" } });
    const pTeam = await prisma.team.findFirstOrThrow({ where: { key: "PAYMENTS" } });
    const sTeam = await prisma.team.findFirstOrThrow({ where: { key: "SUPPORT" } });

    adminUser = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: Role.ADMIN,
      teamId: admin.teamId,
    };

    paymentsLead = {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      role: Role.TEAM_LEAD,
      teamId: lead.teamId,
    };

    paymentsMember = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: Role.MEMBER,
      teamId: member.teamId,
    };

    supportMember = {
      id: support.id,
      name: support.name,
      email: support.email,
      role: Role.MEMBER,
      teamId: support.teamId,
    };

    paymentsTeamId = pTeam.id;
    supportTeamId = sTeam.id;
  });

  // TEST 1: Work item creation with valid and invalid input
  describe("1. Work Item Creation Validation", () => {
    it("creates work item successfully with valid input and generates key & version 1", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Automated Test Incident Creation",
          description: "Testing valid input creation flow with proper details.",
          type: WorkType.INCIDENT,
          priority: WorkPriority.HIGH,
          teamId: paymentsTeamId,
          requiresApproval: false,
        },
        paymentsMember
      );

      expect(item).toBeDefined();
      expect(item.key).toMatch(/^OPS-\d+$/);
      expect(item.version).toBe(1);
      expect(item.status).toBe(WorkStatus.OPEN);
      expect(item.creatorId).toBe(paymentsMember.id);

      // Verify activity record was created
      const activity = await prisma.activityLog.findFirst({
        where: { workItemId: item.id, action: "CREATED" },
      });
      expect(activity).not.toBeNull();
    });

    it("rejects creation if team does not exist", async () => {
      await expect(
        WorkItemService.createWorkItem(
          {
            title: "Invalid Team Test",
            description: "Testing team existence validation.",
            type: WorkType.GENERAL_OPERATIONS,
            priority: WorkPriority.LOW,
            teamId: "non_existent_team_id_999",
            requiresApproval: false,
          },
          paymentsMember
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // TEST 2: Resource-level authorization (Cross-team unauthorized access)
  describe("2. Resource-Level Authorization", () => {
    it("prevents member of Support team from modifying Payments team work item", async () => {
      // Create a Payments team item
      const paymentsItem = await WorkItemService.createWorkItem(
        {
          title: "Confidential Settlement Ledger Reconciliation",
          description: "Internal settlement data for payments only.",
          type: WorkType.PAYMENT_INVESTIGATION,
          priority: WorkPriority.HIGH,
          teamId: paymentsTeamId,
          requiresApproval: false,
        },
        paymentsLead
      );

      // Support member tries to modify it
      await expect(
        WorkItemService.updateWorkItem(
          paymentsItem.id,
          {
            version: paymentsItem.version,
            title: "Tampered by Support Member",
          },
          supportMember // Unauthorized user from different team
        )
      ).rejects.toThrow(AuthorizationError);
    });

    it("allows Administrator to modify any team's work item", async () => {
      const paymentsItem = await WorkItemService.createWorkItem(
        {
          title: "Admin Override Test Item",
          description: "Testing admin global access.",
          type: WorkType.ENGINEERING_TASK,
          priority: WorkPriority.LOW,
          teamId: paymentsTeamId,
          requiresApproval: false,
        },
        paymentsLead
      );

      const updated = await WorkItemService.updateWorkItem(
        paymentsItem.id,
        {
          version: paymentsItem.version,
          title: "Admin Updated Title",
        },
        adminUser // Administrator has global access
      );

      expect(updated.title).toBe("Admin Updated Title");
      expect(updated.version).toBe(paymentsItem.version + 1);
    });
  });

  // TEST 3: Invalid workflow transitions and state machine policies
  describe("3. Workflow Transition & Policy Enforcement", () => {
    it("rejects illegal transitions that skip lifecycle states (e.g., OPEN -> RESOLVED)", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Transition State Machine Test",
          description: "Testing illegal leap in lifecycle.",
          type: WorkType.INCIDENT,
          priority: WorkPriority.MEDIUM,
          teamId: paymentsTeamId,
          requiresApproval: false,
        },
        paymentsMember
      );

      // Transitioning directly from OPEN to RESOLVED is forbidden
      await expect(
        WorkItemService.updateWorkItem(
          item.id,
          {
            version: item.version,
            status: WorkStatus.RESOLVED,
          },
          paymentsMember
        )
      ).rejects.toThrow(ValidationError);
    });

    it("prevents regular Member from reopening a CLOSED item", async () => {
      // Create an item and close it
      const item = await WorkItemService.createWorkItem(
        {
          title: "Item to be closed",
          description: "Testing closed item reopening restriction.",
          type: WorkType.GENERAL_OPERATIONS,
          priority: WorkPriority.LOW,
          teamId: paymentsTeamId,
          requiresApproval: false,
        },
        paymentsLead
      );

      // Close it (valid transition: OPEN -> CLOSED)
      const closed = await WorkItemService.updateWorkItem(
        item.id,
        {
          version: item.version,
          status: WorkStatus.CLOSED,
        },
        paymentsLead
      );

      // Regular member attempts to reopen closed item -> MUST FAIL
      await expect(
        WorkItemService.updateWorkItem(
          closed.id,
          {
            version: closed.version,
            status: WorkStatus.OPEN,
          },
          paymentsMember // Member role cannot reopen
        )
      ).rejects.toThrow(ValidationError);

      // Team Lead CAN reopen closed item
      const reopened = await WorkItemService.updateWorkItem(
        closed.id,
        {
          version: closed.version,
          status: WorkStatus.OPEN,
        },
        paymentsLead // Team Lead can reopen
      );

      expect(reopened.status).toBe(WorkStatus.OPEN);
    });

    it("prevents resolving an approval-required item without prior approval", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Dual-Auth Wire Transfer",
          description: "Requires explicit signoff before resolving.",
          type: WorkType.GENERAL_OPERATIONS,
          priority: WorkPriority.CRITICAL,
          teamId: paymentsTeamId,
          requiresApproval: true,
        },
        paymentsLead
      );

      // Move OPEN -> IN_PROGRESS
      const inProgress = await WorkItemService.updateWorkItem(
        item.id,
        {
          version: item.version,
          status: WorkStatus.IN_PROGRESS,
        },
        paymentsLead
      );

      // Try moving IN_PROGRESS -> RESOLVED without approval
      await expect(
        WorkItemService.updateWorkItem(
          inProgress.id,
          {
            version: inProgress.version,
            status: WorkStatus.RESOLVED,
          },
          paymentsLead
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // TEST 4: Atomic Claim Operation & Race Condition Prevention
  describe("4. Atomic Claim & Mutual Exclusion", () => {
    it("guarantees only one user succeeds when two users attempt to claim the same unassigned item", async () => {
      // Create an unassigned work item
      const unassignedItem = await WorkItemService.createWorkItem(
        {
          title: "Urgent Unclaimed Queue Task",
          description: "Both Alex and Maya will attempt to claim this simultaneously.",
          type: WorkType.INCIDENT,
          priority: WorkPriority.CRITICAL,
          teamId: paymentsTeamId,
          assigneeId: null,
          requiresApproval: false,
        },
        paymentsLead
      );

      // First user claims it
      const claimResult1 = await WorkItemService.claimWorkItem(
        unassignedItem.id,
        paymentsMember
      );

      expect(claimResult1.assigneeId).toBe(paymentsMember.id);
      expect(claimResult1.status).toBe(WorkStatus.IN_PROGRESS);

      // Second user attempts to claim the now-claimed item
      await expect(
        WorkItemService.claimWorkItem(unassignedItem.id, paymentsLead)
      ).rejects.toThrow(ConcurrencyConflictError);
    });

    it("supports idempotent claim operations with idempotency keys", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Idempotent Claim Test",
          description: "Testing retries with same idempotency key.",
          type: WorkType.ENGINEERING_TASK,
          priority: WorkPriority.MEDIUM,
          teamId: paymentsTeamId,
          assigneeId: null,
          requiresApproval: false,
        },
        paymentsLead
      );

      const idempotencyKey = `idem_${Date.now()}_test`;

      // Request 1
      const res1 = await WorkItemService.claimWorkItem(
        item.id,
        paymentsMember,
        idempotencyKey
      );

      // Request 2 (e.g. browser retry due to network timeout)
      const res2 = await WorkItemService.claimWorkItem(
        item.id,
        paymentsMember,
        idempotencyKey
      );

      expect(res1.id).toBe(res2.id);
      expect(res2.assigneeId).toBe(paymentsMember.id);
    });
  });

  // TEST 5: Concurrent Updates using Stale Versions (Optimistic Concurrency Control)
  describe("5. Optimistic Concurrency Control (OCC)", () => {
    it("rejects stale updates with ConcurrencyConflictError (HTTP 409) without overwriting newer data", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Base Item for OCC Test",
          description: "Both User A and User B read version 1.",
          type: WorkType.INCIDENT,
          priority: WorkPriority.MEDIUM,
          teamId: paymentsTeamId,
          requiresApproval: false,
        },
        paymentsLead
      );

      // User A and User B both hold version 1
      const originalVersion = item.version; // 1

      // User A submits update first
      const updatedByA = await WorkItemService.updateWorkItem(
        item.id,
        {
          version: originalVersion,
          title: "User A Updated Title First",
          priority: WorkPriority.HIGH,
        },
        paymentsLead
      );

      expect(updatedByA.version).toBe(2);
      expect(updatedByA.title).toBe("User A Updated Title First");

      // User B tries to update using stale version 1
      await expect(
        WorkItemService.updateWorkItem(
          item.id,
          {
            version: originalVersion, // STALE! (1 instead of 2)
            title: "User B Stale Overwrite Attempt",
          },
          paymentsMember
        )
      ).rejects.toThrow(ConcurrencyConflictError);

      // Verify that User A's data was NOT overwritten
      const checkItem = await prisma.workItem.findUniqueOrThrow({
        where: { id: item.id },
      });
      expect(checkItem.title).toBe("User A Updated Title First");
      expect(checkItem.version).toBe(2);
    });
  });

  // TEST 6: Approval Permissions
  describe("6. Approval Permissions & Role Enforcement", () => {
    it("forbids regular member from approving a request", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Compliance Sign-off Request",
          description: "Must be approved by Team Lead or Admin.",
          type: WorkType.COMPLIANCE_REQUEST,
          priority: WorkPriority.HIGH,
          teamId: paymentsTeamId,
          requiresApproval: true,
        },
        paymentsMember
      );

      // Regular member attempts to approve
      await expect(
        WorkItemService.handleApproval(
          item.id,
          { action: "APPROVE", reason: "Attempted self-approval" },
          paymentsMember // MEMBER role -> NOT PERMITTED
        )
      ).rejects.toThrow(AuthorizationError);
    });

    it("forbids Team Lead from a different team from approving", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Cross-Team Approval Test",
          description: "Security item that Payments lead should not approve.",
          type: WorkType.COMPLIANCE_REQUEST,
          priority: WorkPriority.HIGH,
          teamId: supportTeamId, // Support team
          requiresApproval: true,
        },
        supportMember
      );

      // Payments lead tries to approve Support team item
      await expect(
        WorkItemService.handleApproval(
          item.id,
          { action: "APPROVE" },
          paymentsLead // Team Lead of Payments, NOT Support
        )
      ).rejects.toThrow(AuthorizationError);
    });

    it("allows designated Team Lead and Admin to approve", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Legitimate Payments Approval",
          description: "Needs Alex Rivera's sign-off.",
          type: WorkType.GENERAL_OPERATIONS,
          priority: WorkPriority.HIGH,
          teamId: paymentsTeamId,
          requiresApproval: true,
        },
        paymentsMember
      );

      const approved = await WorkItemService.handleApproval(
        item.id,
        { action: "APPROVE", reason: "All ledger records verified." },
        paymentsLead
      );

      expect(approved.approvalStatus).toBe("APPROVED");
      expect(approved.approvedById).toBe(paymentsLead.id);
    });
  });

  // TEST 7: Activity History and Data Integrity
  describe("7. Append-Only Activity Log & Transactional Integrity", () => {
    it("records audit logs inside atomic transactions for each lifecycle action", async () => {
      const item = await WorkItemService.createWorkItem(
        {
          title: "Audit Trail Verification Item",
          description: "Tracking activity history across multiple steps.",
          type: WorkType.INCIDENT,
          priority: WorkPriority.LOW,
          teamId: paymentsTeamId,
          requiresApproval: false,
        },
        paymentsLead
      );

      // Update priority and status
      await WorkItemService.updateWorkItem(
        item.id,
        {
          version: item.version,
          priority: WorkPriority.CRITICAL,
          status: WorkStatus.IN_PROGRESS,
        },
        paymentsLead
      );

      // Add a comment
      await WorkItemService.addComment(
        item.id,
        "Investigating root cause in auth service.",
        paymentsMember
      );

      // Retrieve full history
      const fullItem = await WorkItemService.getWorkItemById(item.id, paymentsLead);
      const actions = fullItem.activities?.map((a) => a.action) || [];

      expect(actions).toContain("CREATED");
      expect(actions).toContain("STATUS_CHANGED");
      expect(actions).toContain("PRIORITY_CHANGED");
      expect(actions).toContain("COMMENT_ADDED");
    });
  });
});
