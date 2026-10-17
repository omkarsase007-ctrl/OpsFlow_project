export type Role = "MEMBER" | "TEAM_LEAD" | "ADMIN";
export const Role = {
  MEMBER: "MEMBER" as Role,
  TEAM_LEAD: "TEAM_LEAD" as Role,
  ADMIN: "ADMIN" as Role,
};

export type WorkType =
  | "INCIDENT"
  | "CUSTOMER_ISSUE"
  | "ENGINEERING_TASK"
  | "PAYMENT_INVESTIGATION"
  | "COMPLIANCE_REQUEST"
  | "GENERAL_OPERATIONS";

export const WorkType = {
  INCIDENT: "INCIDENT" as WorkType,
  CUSTOMER_ISSUE: "CUSTOMER_ISSUE" as WorkType,
  ENGINEERING_TASK: "ENGINEERING_TASK" as WorkType,
  PAYMENT_INVESTIGATION: "PAYMENT_INVESTIGATION" as WorkType,
  COMPLIANCE_REQUEST: "COMPLIANCE_REQUEST" as WorkType,
  GENERAL_OPERATIONS: "GENERAL_OPERATIONS" as WorkType,
};

export type WorkStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "IN_REVIEW"
  | "RESOLVED"
  | "CLOSED";

export const WorkStatus = {
  OPEN: "OPEN" as WorkStatus,
  IN_PROGRESS: "IN_PROGRESS" as WorkStatus,
  BLOCKED: "BLOCKED" as WorkStatus,
  IN_REVIEW: "IN_REVIEW" as WorkStatus,
  RESOLVED: "RESOLVED" as WorkStatus,
  CLOSED: "CLOSED" as WorkStatus,
};

export type WorkPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const WorkPriority = {
  LOW: "LOW" as WorkPriority,
  MEDIUM: "MEDIUM" as WorkPriority,
  HIGH: "HIGH" as WorkPriority,
  CRITICAL: "CRITICAL" as WorkPriority,
};

export type ApprovalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export const ApprovalStatus = {
  NONE: "NONE" as ApprovalStatus,
  PENDING: "PENDING" as ApprovalStatus,
  APPROVED: "APPROVED" as ApprovalStatus,
  REJECTED: "REJECTED" as ApprovalStatus,
};

export type ActivityAction =
  | "CREATED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "DETAILS_UPDATED"
  | "COMMENT_ADDED"
  | "APPROVAL_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export const ActivityAction = {
  CREATED: "CREATED" as ActivityAction,
  ASSIGNED: "ASSIGNED" as ActivityAction,
  UNASSIGNED: "UNASSIGNED" as ActivityAction,
  STATUS_CHANGED: "STATUS_CHANGED" as ActivityAction,
  PRIORITY_CHANGED: "PRIORITY_CHANGED" as ActivityAction,
  DETAILS_UPDATED: "DETAILS_UPDATED" as ActivityAction,
  COMMENT_ADDED: "COMMENT_ADDED" as ActivityAction,
  APPROVAL_REQUESTED: "APPROVAL_REQUESTED" as ActivityAction,
  APPROVED: "APPROVED" as ActivityAction,
  REJECTED: "REJECTED" as ActivityAction,
};

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
  teamId?: string | null;
  teamName?: string | null;
}

export interface WorkItemWithRelations {
  id: string;
  key: string;
  title: string;
  description: string;
  type: WorkType;
  status: WorkStatus;
  priority: WorkPriority;
  dueDate: Date | string | null;
  version: number;
  teamId: string;
  team: {
    id: string;
    key: string;
    name: string;
  };
  creatorId: string;
  creator: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  assigneeId: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  } | null;
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  approvedById?: string | null;
  approvedBy?: {
    id: string;
    name: string;
  } | null;
  approvedAt?: Date | string | null;
  rejectionReason?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: Date | string;
    author: {
      id: string;
      name: string;
      avatar?: string | null;
    };
  }>;
  activities?: Array<{
    id: string;
    action: ActivityAction;
    details: string;
    createdAt: Date | string;
    actor: {
      id: string;
      name: string;
    };
  }>;
}

export interface WorkItemListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WorkStatus | "ALL";
  priority?: WorkPriority | "ALL";
  type?: WorkType | "ALL";
  teamId?: string | "ALL";
  assigneeId?: string | "ALL" | "UNASSIGNED";
  sortBy?: "updatedAt" | "priority" | "dueDate" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ConcurrencyConflictError {
  error: "CONCURRENCY_CONFLICT";
  message: string;
  currentVersion: number;
  currentData: {
    id: string;
    key: string;
    title: string;
    status: WorkStatus;
    priority: WorkPriority;
    version: number;
    updatedAt: string;
  };
}
