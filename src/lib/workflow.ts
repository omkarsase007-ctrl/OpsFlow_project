import { Role, WorkStatus, ApprovalStatus, SessionUser } from "./types";

/**
 * Valid state transitions for Work Items
 */
export const ALLOWED_TRANSITIONS: Record<WorkStatus, WorkStatus[]> = {
  OPEN: [WorkStatus.IN_PROGRESS, WorkStatus.BLOCKED, WorkStatus.CLOSED],
  IN_PROGRESS: [WorkStatus.BLOCKED, WorkStatus.IN_REVIEW, WorkStatus.RESOLVED, WorkStatus.OPEN],
  BLOCKED: [WorkStatus.OPEN, WorkStatus.IN_PROGRESS],
  IN_REVIEW: [WorkStatus.RESOLVED, WorkStatus.IN_PROGRESS, WorkStatus.BLOCKED],
  RESOLVED: [WorkStatus.CLOSED, WorkStatus.IN_PROGRESS],
  CLOSED: [WorkStatus.OPEN, WorkStatus.IN_PROGRESS], // Reopening restricted by role
};

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether a user can perform a status transition on a work item
 */
export function validateStatusTransition(params: {
  currentStatus: WorkStatus;
  targetStatus: WorkStatus;
  user: SessionUser;
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  teamId: string;
}): TransitionValidationResult {
  const { currentStatus, targetStatus, user, requiresApproval, approvalStatus } = params;

  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  // 1. Check basic state machine graph
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedNext.join(", ")}`,
    };
  }

  // 2. Closed item reopening policy:
  // Only TEAM_LEAD or ADMIN can reopen a CLOSED item
  if (currentStatus === WorkStatus.CLOSED) {
    if (user.role !== Role.ADMIN && user.role !== Role.TEAM_LEAD) {
      return {
        allowed: false,
        reason: "Only a Team Lead or Administrator has permission to reopen a closed work item.",
      };
    }
  }

  // 3. Approval requirement policy:
  // An item requiring approval CANNOT move to RESOLVED or CLOSED without explicit APPROVED status
  if (requiresApproval) {
    if (targetStatus === WorkStatus.RESOLVED || targetStatus === WorkStatus.CLOSED) {
      if (approvalStatus !== ApprovalStatus.APPROVED) {
        return {
          allowed: false,
          reason: `This work item requires formal approval before it can be marked as Resolved or Closed. Current approval status: ${approvalStatus}`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Validates whether a user can approve or reject a work item
 */
export function validateApprovalPermission(
  user: SessionUser,
  itemTeamId: string
): { allowed: boolean; reason?: string } {
  // ADMIN can approve any team's items
  if (user.role === Role.ADMIN) {
    return { allowed: true };
  }

  // TEAM_LEAD can approve their own team's items
  if (user.role === Role.TEAM_LEAD && user.teamId === itemTeamId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Unauthorized: Only an Administrator or the designated Team Lead for this team can approve or reject this item.",
  };
}

/**
 * Validates resource-level team authorization
 */
export function validateTeamAccess(
  user: SessionUser,
  itemTeamId: string,
  action: "VIEW" | "MODIFY" | "CLAIM" = "VIEW"
): { allowed: boolean; reason?: string } {
  // Admins have universal access
  if (user.role === Role.ADMIN) {
    return { allowed: true };
  }

  // Same team member or lead has access
  if (user.teamId === itemTeamId) {
    return { allowed: true };
  }

  // Users without a team can only view, not modify
  if (!user.teamId && action !== "VIEW") {
    return {
      allowed: false,
      reason: "User has no assigned team and cannot modify this work item.",
    };
  }

  // Different team
  return {
    allowed: false,
    reason: `Forbidden: You belong to a different team and do not have permission to ${action.toLowerCase()} work items for this team.`,
  };
}
