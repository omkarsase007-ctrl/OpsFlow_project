import { z } from "zod";

export const WorkTypeEnum = z.enum([
  "INCIDENT",
  "CUSTOMER_ISSUE",
  "ENGINEERING_TASK",
  "PAYMENT_INVESTIGATION",
  "COMPLIANCE_REQUEST",
  "GENERAL_OPERATIONS",
]);

export const WorkStatusEnum = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "RESOLVED",
  "CLOSED",
]);

export const WorkPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const createWorkItemSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters"),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(5000, "Description cannot exceed 5000 characters"),
  type: WorkTypeEnum,
  priority: WorkPriorityEnum,
  teamId: z.string().min(1, "Team is required"),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  requiresApproval: z.boolean().default(false),
});

export const updateWorkItemSchema = z.object({
  // Version is REQUIRED for Optimistic Concurrency Control
  version: z
    .number({
      required_error: "Current version number is required for concurrency safety",
    })
    .int()
    .min(1),
  title: z.string().min(3).max(150).optional(),
  description: z.string().min(5).max(5000).optional(),
  type: WorkTypeEnum.optional(),
  status: WorkStatusEnum.optional(),
  priority: WorkPriorityEnum.optional(),
  teamId: z.string().min(1).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  requiresApproval: z.boolean().optional(),
});

export const claimWorkItemSchema = z.object({
  idempotencyKey: z.string().optional(),
});

export const addCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment content cannot be empty")
    .max(2000, "Comment cannot exceed 2000 characters"),
});

export const approvalActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().optional(),
});

export type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>;
export type UpdateWorkItemInput = z.infer<typeof updateWorkItemSchema>;
export type ClaimWorkItemInput = z.infer<typeof claimWorkItemSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;
