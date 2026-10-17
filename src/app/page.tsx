import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { WorkItemService } from "@/lib/services/work-item.service";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { AttentionRequired } from "@/components/dashboard/AttentionRequired";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ShieldCheck, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  const metrics = await WorkItemService.getOverviewMetrics(user);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Operations Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status for active incidents, approvals, and team ownership.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800">Cluster SLA: 99.98%</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Active Persona: <strong>{user.name}</strong></span>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <MetricsOverview metrics={metrics} />

      {/* Dual Section Grid: Attention Required & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <AttentionRequired items={metrics.attentionRequiredItems} />
        <RecentActivityFeed activities={metrics.recentActivities as any} />
      </div>
    </div>
  );
}
