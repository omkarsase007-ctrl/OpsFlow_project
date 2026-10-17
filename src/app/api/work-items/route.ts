import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { WorkItemService, ValidationError } from "@/lib/services/work-item.service";
import { createWorkItemSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const priority = (searchParams.get("priority") as any) || undefined;
    const type = (searchParams.get("type") as any) || undefined;
    const teamId = searchParams.get("teamId") || undefined;
    const assigneeId = searchParams.get("assigneeId") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "updatedAt";
    const sortOrder = (searchParams.get("sortOrder") as any) || "desc";

    const result = await WorkItemService.listWorkItems(user, {
      page,
      pageSize,
      search,
      status,
      priority,
      type,
      teamId,
      assigneeId,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/work-items error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Failed to fetch work items" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const parsed = createWorkItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const created = await WorkItemService.createWorkItem(parsed.data, user);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/work-items error:", error);
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Failed to create work item" },
      { status: 500 }
    );
  }
}
