import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  WorkItemService,
  ConcurrencyConflictError,
  AuthorizationError,
  NotFoundError,
} from "@/lib/services/work-item.service";
import { claimWorkItemSchema } from "@/lib/validation";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    let idempotencyKey: string | undefined;

    try {
      const body = await req.json();
      const parsed = claimWorkItemSchema.safeParse(body);
      if (parsed.success && parsed.data.idempotencyKey) {
        idempotencyKey = parsed.data.idempotencyKey;
      }
    } catch {
      // Empty body is acceptable for claim
    }

    const claimed = await WorkItemService.claimWorkItem(
      params.id,
      user,
      idempotencyKey
    );

    return NextResponse.json(claimed);
  } catch (error: any) {
    console.error("POST /api/work-items/[id]/claim error:", error);

    // Mutual exclusion conflict: another user claimed it first (HTTP 409)
    if (error instanceof ConcurrencyConflictError) {
      return NextResponse.json(
        {
          error: "CLAIM_CONFLICT",
          message: error.message,
          currentVersion: error.currentVersion,
          currentData: error.currentData,
        },
        { status: 409 }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Failed to claim work item" },
      { status: 500 }
    );
  }
}
