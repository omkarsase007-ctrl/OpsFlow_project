import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalsList } from "./ApprovalsList";
import { CheckSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();

  const [pendingApprovals, historicalApprovals] = await Promise.all([
    prisma.workItem.findMany({
      where: {
        requiresApproval: true,
        approvalStatus: "PENDING",
      },
      include: {
        team: true,
        creator: true,
        assignee: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.workItem.findMany({
      where: {
        requiresApproval: true,
        approvalStatus: { in: ["APPROVED", "REJECTED"] },
      },
      take: 10,
      include: {
        team: true,
        creator: true,
        approvedBy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-600" />
            Operational Approvals Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compliance items, high-value transfers, and escalated changes requiring dual sign-off.
          </p>
        </div>

        <div className="text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
          Pending Review: {pendingApprovals.length}
        </div>
      </div>

      <ApprovalsList
        user={user}
        pendingItems={pendingApprovals as any}
        historyItems={historicalApprovals as any}
      />
    </div>
  );
}
