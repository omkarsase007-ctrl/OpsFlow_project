import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  WorkItemService,
  ConcurrencyConflictError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "@/lib/services/work-item.service";
import { updateWorkItemSchema } from "@/lib/validation";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const item = await WorkItemService.getWorkItemById(params.id, user);
    return NextResponse.json(item);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Failed to fetch work item" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const parsed = updateWorkItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const updated = await WorkItemService.updateWorkItem(params.id, parsed.data, user);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/work-items/[id] error:", error);

    // 1. Optimistic Concurrency Control Conflict (HTTP 409)
    if (error instanceof ConcurrencyConflictError) {
      return NextResponse.json(
        {
          error: "CONCURRENCY_CONFLICT",
          message: error.message,
          currentVersion: error.currentVersion,
          currentData: error.currentData,
        },
        { status: 409 }
      );
    }

    // 2. Resource-level Authorization Failure (HTTP 403)
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }

    // 3. Workflow Rule Violation (HTTP 422)
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: "UNPROCESSABLE_ENTITY", message: error.message },
        { status: 422 }
      );
    }

    // 4. Record Not Found (HTTP 404)
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Failed to update work item" },
      { status: 500 }
    );
  }
}
