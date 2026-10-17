import { prisma } from "../prisma";
import {
  SessionUser,
  WorkItemListParams,
  PaginatedResponse,
  WorkItemWithRelations,
  WorkStatus,
  WorkPriority,
  WorkType,
  ActivityAction,
} from "../types";
import {
  validateStatusTransition,
  validateApprovalPermission,
  validateTeamAccess,
} from "../workflow";
import {
  CreateWorkItemInput,
  UpdateWorkItemInput,
  ApprovalActionInput,
} from "../validation";

export class ConcurrencyConflictError extends Error {
  public currentVersion: number;
  public currentData: any;

  constructor(message: string, currentVersion: number, currentData: any) {
    super(message);
    this.name = "ConcurrencyConflictError";
    this.currentVersion = currentVersion;
    this.currentData = currentData;
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class WorkItemService {
  /**
   * Generates the next sequential work item key (e.g., OPS-1009)
   */
  private static async getNextKey(): Promise<string> {
    const lastItem = await prisma.workItem.findFirst({
      orderBy: { createdAt: "desc" },
      select: { key: true },
    });

    if (!lastItem || !lastItem.key.startsWith("OPS-")) {
      return "OPS-1001";
    }

    const numPart = parseInt(lastItem.key.replace("OPS-", ""), 10);
    const nextNum = isNaN(numPart) ? 1001 : numPart + 1;
    return `OPS-${nextNum}`;
  }

  /**
   * List work items with server-side filtering, searching, sorting, and pagination
   */
  static async listWorkItems(
    user: SessionUser,
    params: WorkItemListParams
  ): Promise<PaginatedResponse<WorkItemWithRelations>> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 10));
    const skip = (page - 1) * pageSize;

    // Build filter conditions
    const where: any = {};

    // Search query matching key, title, or description
    if (params.search && params.search.trim() !== "") {
      const search = params.search.trim();
      where.OR = [
        { key: { contains: search } },
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Status filter
    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }

    // Priority filter
    if (params.priority && params.priority !== "ALL") {
      where.priority = params.priority;
    }

    // Type filter
    if (params.type && params.type !== "ALL") {
      where.type = params.type;
    }

    // Team filter
    if (params.teamId && params.teamId !== "ALL") {
      where.teamId = params.teamId;
    }

    // Assignee filter
    if (params.assigneeId) {
      if (params.assigneeId === "UNASSIGNED") {
        where.assigneeId = null;
      } else if (params.assigneeId !== "ALL") {
        where.assigneeId = params.assigneeId;
      }
    }

    // Determine sorting
    const sortBy = params.sortBy || "updatedAt";
    const sortOrder = params.sortOrder || "desc";
    const orderBy: any = { [sortBy]: sortOrder };

    const [total, items] = await Promise.all([
      prisma.workItem.count({ where }),
      prisma.workItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          team: {
            select: { id: true, key: true, name: true },
          },
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return {
      data: items as unknown as WorkItemWithRelations[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Get single work item with detailed relations
   */
  static async getWorkItemById(
    id: string,
    user: SessionUser
  ): Promise<WorkItemWithRelations> {
    const item = await prisma.workItem.findUnique({
      where: { id },
      include: {
        team: {
          select: { id: true, key: true, name: true },
        },
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: {
            actor: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!item) {
      throw new NotFoundError(`Work item with ID "${id}" was not found.`);
    }

    return item as unknown as WorkItemWithRelations;
  }

  /**
   * Create a new work item with validation and atomic activity log
   */
  static async createWorkItem(
    input: CreateWorkItemInput,
    user: SessionUser
  ): Promise<WorkItemWithRelations> {
    // Check team exists
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
    });

    if (!team) {
      throw new ValidationError(`Team with ID "${input.teamId}" does not exist.`);
    }

    const key = await this.getNextKey();
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;

    // Execute in transaction to commit work item and initial activity log together
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.workItem.create({
        data: {
          key,
          title: input.title,
          description: input.description,
          type: input.type,
          priority: input.priority,
          status: WorkStatus.OPEN,
          teamId: input.teamId,
          creatorId: user.id,
          assigneeId: input.assigneeId || null,
          dueDate,
          requiresApproval: input.requiresApproval ?? false,
          approvalStatus: input.requiresApproval ? "PENDING" : "NONE",
          version: 1,
        },
        include: {
          team: { select: { id: true, key: true, name: true } },
          creator: { select: { id: true, name: true, email: true, avatar: true } },
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
        },
      });

      // Append-only activity log
      await tx.activityLog.create({
        data: {
          workItemId: created.id,
          actorId: user.id,
          action: ActivityAction.CREATED,
          details: JSON.stringify({
            title: created.title,
            type: created.type,
            priority: created.priority,
            requiresApproval: created.requiresApproval,
          }),
        },
      });

      if (created.assigneeId) {
        await tx.activityLog.create({
          data: {
            workItemId: created.id,
            actorId: user.id,
            action: ActivityAction.ASSIGNED,
            details: JSON.stringify({
              assigneeId: created.assigneeId,
              assigneeName: created.assignee?.name || "User",
            }),
          },
        });
      }

      return created;
    });

    return result as unknown as WorkItemWithRelations;
  }

  /**
   * Update work item with Optimistic Concurrency Control (OCC)
   * Prevents lost updates when two users edit simultaneously.
   */
  static async updateWorkItem(
    id: string,
    input: UpdateWorkItemInput,
    user: SessionUser
  ): Promise<WorkItemWithRelations> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch current work item record
      const current = await tx.workItem.findUnique({
        where: { id },
        include: {
          team: true,
          assignee: true,
        },
      });

      if (!current) {
        throw new NotFoundError(`Work item with ID "${id}" was not found.`);
      }

      // 2. Resource-level authorization check
      const authCheck = validateTeamAccess(user, current.teamId, "MODIFY");
      if (!authCheck.allowed) {
        throw new AuthorizationError(authCheck.reason || "Unauthorized to modify this work item.");
      }

      // 3. OPTIMISTIC CONCURRENCY CONTROL (OCC) CHECK
      // Compares the client's submitted version against current database version
      if (current.version !== input.version) {
        throw new ConcurrencyConflictError(
          `Conflict detected: This work item was modified by another user while you were viewing it (Current version: ${current.version}, Submitted version: ${input.version}). Please reload to inspect the newest changes before reapplying.`,
          current.version,
          {
            id: current.id,
            key: current.key,
            title: current.title,
            status: current.status as WorkStatus,
            priority: current.priority as WorkPriority,
            version: current.version,
            updatedAt: current.updatedAt.toISOString(),
          }
        );
      }

      // 4. Status transition validation
      if (input.status && input.status !== current.status) {
        const transitionCheck = validateStatusTransition({
          currentStatus: current.status as WorkStatus,
          targetStatus: input.status,
          user,
          requiresApproval: current.requiresApproval,
          approvalStatus: current.approvalStatus as any,
          teamId: current.teamId,
        });

        if (!transitionCheck.allowed) {
          throw new ValidationError(transitionCheck.reason || "Invalid status transition.");
        }
      }

      // 5. Build changes diff for audit history
      const changes: Record<string, { from: any; to: any }> = {};

      if (input.title && input.title !== current.title) {
        changes.title = { from: current.title, to: input.title };
      }
      if (input.description && input.description !== current.description) {
        changes.description = { from: "...", to: "..." };
      }
      if (input.status && input.status !== current.status) {
        changes.status = { from: current.status, to: input.status };
      }
      if (input.priority && input.priority !== current.priority) {
        changes.priority = { from: current.priority, to: input.priority };
      }
      if (input.type && input.type !== current.type) {
        changes.type = { from: current.type, to: input.type };
      }
      if (input.assigneeId !== undefined && input.assigneeId !== current.assigneeId) {
        changes.assignee = { from: current.assigneeId, to: input.assigneeId };
      }

      // 6. Perform the atomic update with version increment
      const updated = await tx.workItem.update({
        where: {
          id,
          version: current.version, // Atomic condition ensures no race condition
        },
        data: {
          title: input.title,
          description: input.description,
          type: input.type,
          status: input.status,
          priority: input.priority,
          assigneeId: input.assigneeId,
          teamId: input.teamId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          requiresApproval: input.requiresApproval,
          version: { increment: 1 }, // Atomically bump version
        },
        include: {
          team: { select: { id: true, key: true, name: true } },
          creator: { select: { id: true, name: true, email: true, avatar: true } },
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });

      // 7. Write append-only activity records for all changes
      if (changes.status) {
        await tx.activityLog.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: ActivityAction.STATUS_CHANGED,
            details: JSON.stringify(changes.status),
          },
        });
      }

      if (changes.priority) {
        await tx.activityLog.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: ActivityAction.PRIORITY_CHANGED,
            details: JSON.stringify(changes.priority),
          },
        });
      }

      if (changes.assignee) {
        await tx.activityLog.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: input.assigneeId ? ActivityAction.ASSIGNED : ActivityAction.UNASSIGNED,
            details: JSON.stringify(changes.assignee),
          },
        });
      }

      if (Object.keys(changes).length > 0 && !changes.status && !changes.priority && !changes.assignee) {
        await tx.activityLog.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: ActivityAction.DETAILS_UPDATED,
            details: JSON.stringify(changes),
          },
        });
      }

      return updated as unknown as WorkItemWithRelations;
    });
  }

  /**
   * Atomic Claim Operation
   * Guarantees mutual exclusion: if two users claim simultaneously, exactly one succeeds.
   * Supports idempotency key for safe retries.
   */
  static async claimWorkItem(
    id: string,
    user: SessionUser,
    idempotencyKey?: string
  ): Promise<WorkItemWithRelations> {
    // 1. Idempotency Key Check
    if (idempotencyKey) {
      const cached = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (cached && cached.userId === user.id) {
        return JSON.parse(cached.response) as WorkItemWithRelations;
      }
    }

    return prisma.$transaction(async (tx) => {
      // 2. Fetch current state
      const item = await tx.workItem.findUnique({
        where: { id },
        include: {
          assignee: true,
          team: true,
        },
      });

      if (!item) {
        throw new NotFoundError(`Work item with ID "${id}" was not found.`);
      }

      // 3. Team Authorization
      const auth = validateTeamAccess(user, item.teamId, "CLAIM");
      if (!auth.allowed) {
        throw new AuthorizationError(auth.reason || "Unauthorized to claim this work item.");
      }

      // 4. Mutual Exclusion / Conflict Check
      if (item.assigneeId) {
        if (item.assigneeId === user.id) {
          // Idempotent: User already has this item claimed
          return item as unknown as WorkItemWithRelations;
        }

        // Another user already claimed this work item
        throw new ConcurrencyConflictError(
          `Conflict: Work item "${item.key}" has already been claimed by ${item.assignee?.name || "another team member"}.`,
          item.version,
          {
            id: item.id,
            key: item.key,
            title: item.title,
            status: item.status as WorkStatus,
            priority: item.priority as WorkPriority,
            version: item.version,
            updatedAt: item.updatedAt.toISOString(),
          }
        );
      }

      // 5. Atomic conditional update: only claim if assigneeId is still null
      const updated = await tx.workItem.update({
        where: {
          id,
          version: item.version,
        },
        data: {
          assigneeId: user.id,
          // Move from OPEN to IN_PROGRESS upon claim if currently OPEN
          status: item.status === WorkStatus.OPEN ? WorkStatus.IN_PROGRESS : item.status,
          version: { increment: 1 },
        },
        include: {
          team: { select: { id: true, key: true, name: true } },
          creator: { select: { id: true, name: true, email: true, avatar: true } },
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });

      // 6. Record in append-only activity log
      await tx.activityLog.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: ActivityAction.ASSIGNED,
          details: JSON.stringify({
            message: `${user.name} claimed this work item.`,
            assignedTo: user.name,
          }),
        },
      });

      if (item.status === WorkStatus.OPEN) {
        await tx.activityLog.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: ActivityAction.STATUS_CHANGED,
            details: JSON.stringify({
              from: WorkStatus.OPEN,
              to: WorkStatus.IN_PROGRESS,
              reason: "Auto-transitioned on claim",
            }),
          },
        });
      }

      // 7. Store idempotency response if key supplied
      if (idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            userId: user.id,
            action: "CLAIM_WORK_ITEM",
            response: JSON.stringify(updated),
          },
        });
      }

      return updated as unknown as WorkItemWithRelations;
    });
  }

  /**
   * Add a comment to a work item and record in activity log
   */
  static async addComment(
    id: string,
    content: string,
    user: SessionUser
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.workItem.findUnique({
        where: { id },
        select: { id: true, teamId: true },
      });

      if (!item) {
        throw new NotFoundError(`Work item with ID "${id}" was not found.`);
      }

      const auth = validateTeamAccess(user, item.teamId, "VIEW");
      if (!auth.allowed) {
        throw new AuthorizationError("You do not have access to view or comment on this work item.");
      }

      const comment = await tx.comment.create({
        data: {
          workItemId: id,
          authorId: user.id,
          content,
        },
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: ActivityAction.COMMENT_ADDED,
          details: JSON.stringify({
            commentId: comment.id,
            snippet: content.substring(0, 100),
          }),
        },
      });

      return comment;
    });
  }

  /**
   * Process approval or rejection
   * Strictly enforces that only authorized Team Leads or Admins can approve
   */
  static async handleApproval(
    id: string,
    input: ApprovalActionInput,
    user: SessionUser
  ): Promise<WorkItemWithRelations> {
    return prisma.$transaction(async (tx) => {
      const item = await tx.workItem.findUnique({
        where: { id },
      });

      if (!item) {
        throw new NotFoundError(`Work item with ID "${id}" was not found.`);
      }

      if (!item.requiresApproval) {
        throw new ValidationError("This work item does not require approval.");
      }

      // Check permission: Admin or designated Team Lead only!
      const permCheck = validateApprovalPermission(user, item.teamId);
      if (!permCheck.allowed) {
        throw new AuthorizationError(permCheck.reason || "Unauthorized to approve or reject this item.");
      }

      if (input.action === "APPROVE") {
        const updated = await tx.workItem.update({
          where: { id, version: item.version },
          data: {
            approvalStatus: "APPROVED",
            approvedById: user.id,
            approvedAt: new Date(),
            rejectionReason: null,
            version: { increment: 1 },
          },
          include: {
            team: { select: { id: true, key: true, name: true } },
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            approvedBy: { select: { id: true, name: true } },
          },
        });

        await tx.activityLog.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: ActivityAction.APPROVED,
            details: JSON.stringify({
              approvedBy: user.name,
              reason: input.reason || "Approved",
            }),
          },
        });

        return updated as unknown as WorkItemWithRelations;
      } else {
        const updated = await tx.workItem.update({
          where: { id, version: item.version },
          data: {
            approvalStatus: "REJECTED",
            rejectionReason: input.reason || "Rejected by supervisor",
            version: { increment: 1 },
          },
          include: {
            team: { select: { id: true, key: true, name: true } },
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            approvedBy: { select: { id: true, name: true } },
          },
        });

        await tx.activityLog.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: ActivityAction.REJECTED,
            details: JSON.stringify({
              rejectedBy: user.name,
              reason: input.reason || "Rejected by reviewer",
            }),
          },
        });

        return updated as unknown as WorkItemWithRelations;
      }
    });
  }

  /**
   * Overview dashboard metrics
   */
  static async getOverviewMetrics(user: SessionUser) {
    const now = new Date();

    const [
      totalActive,
      criticalAndHigh,
      assignedToMe,
      blockedItems,
      overdueItems,
      awaitingApproval,
      attentionRequiredItems,
      recentActivities,
    ] = await Promise.all([
      // Total active (not resolved or closed)
      prisma.workItem.count({
        where: {
          status: { notIn: [WorkStatus.RESOLVED, WorkStatus.CLOSED] },
        },
      }),

      // Critical and high priority active
      prisma.workItem.count({
        where: {
          priority: { in: [WorkPriority.CRITICAL, WorkPriority.HIGH] },
          status: { notIn: [WorkStatus.RESOLVED, WorkStatus.CLOSED] },
        },
      }),

      // Assigned to current user
      prisma.workItem.count({
        where: {
          assigneeId: user.id,
          status: { notIn: [WorkStatus.RESOLVED, WorkStatus.CLOSED] },
        },
      }),

      // Blocked
      prisma.workItem.count({
        where: { status: WorkStatus.BLOCKED },
      }),

      // Overdue
      prisma.workItem.count({
        where: {
          dueDate: { lt: now },
          status: { notIn: [WorkStatus.RESOLVED, WorkStatus.CLOSED] },
        },
      }),

      // Awaiting Approval
      prisma.workItem.count({
        where: {
          requiresApproval: true,
          approvalStatus: "PENDING",
        },
      }),

      // Attention Required Items (Critical unassigned, overdue, blocked, pending approval)
      prisma.workItem.findMany({
        where: {
          OR: [
            {
              priority: WorkPriority.CRITICAL,
              assigneeId: null,
              status: { notIn: [WorkStatus.RESOLVED, WorkStatus.CLOSED] },
            },
            {
              requiresApproval: true,
              approvalStatus: "PENDING",
            },
            {
              status: WorkStatus.BLOCKED,
            },
            {
              dueDate: { lt: now },
              status: { notIn: [WorkStatus.RESOLVED, WorkStatus.CLOSED] },
            },
          ],
        },
        take: 5,
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        include: {
          team: { select: { id: true, key: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      }),

      // Recent Activity Feed
      prisma.activityLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, name: true } },
          workItem: { select: { id: true, key: true, title: true } },
        },
      }),
    ]);

    return {
      totalActive,
      criticalAndHigh,
      assignedToMe,
      blockedItems,
      overdueItems,
      awaitingApproval,
      attentionRequiredItems,
      recentActivities,
    };
  }
}
