import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  WorkItemService,
  AuthorizationError,
  NotFoundError,
} from "@/lib/services/work-item.service";
import { addCommentSchema } from "@/lib/validation";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const parsed = addCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid comment content" },
        { status: 400 }
      );
    }

    const comment = await WorkItemService.addComment(
      params.id,
      parsed.data.content,
      user
    );

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
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
      { error: "INTERNAL_ERROR", message: error.message || "Failed to add comment" },
      { status: 500 }
    );
  }
}
