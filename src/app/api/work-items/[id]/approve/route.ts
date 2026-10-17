import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  WorkItemService,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "@/lib/services/work-item.service";
import { approvalActionSchema } from "@/lib/validation";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const parsed = approvalActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid approval action", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await WorkItemService.handleApproval(
      params.id,
      parsed.data,
      user
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: "UNPROCESSABLE_ENTITY", message: error.message },
        { status: 422 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Failed to process approval" },
      { status: 500 }
    );
  }
}
