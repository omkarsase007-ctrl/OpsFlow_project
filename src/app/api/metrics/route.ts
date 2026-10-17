import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { WorkItemService } from "@/lib/services/work-item.service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const metrics = await WorkItemService.getOverviewMetrics(user);
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("GET /api/metrics error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
