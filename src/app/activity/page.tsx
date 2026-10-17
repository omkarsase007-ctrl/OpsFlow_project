import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { History, Shield, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getCurrentUser();

  const activities = await prisma.activityLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      actor: true,
      workItem: {
        include: {
          team: true,
        },
      },
    },
  });

  const parseDetails = (detailsStr: string) => {
    try {
      const data = JSON.parse(detailsStr);
      if (data.from && data.to) {
        return `Changed status from ${data.from} to ${data.to}`;
      }
      if (data.message) {
        return data.message;
      }
      if (data.assignedTo) {
        return `Assigned to ${data.assignedTo}`;
      }
      if (data.snippet) {
        return `Commented: "${data.snippet}"`;
      }
      if (data.title) {
        return `Created item: "${data.title}"`;
      }
      return JSON.stringify(data);
    } catch {
      return detailsStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            System Audit Log & Activity Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable, append-only chronological log of all mutations committed across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tamper-Resistant Log</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Work Item</th>
                <th className="py-3 px-4">Details / Metadata</th>
                <th className="py-3 px-4 text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(act.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {act.actor.name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                        {act.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {act.workItem.key}
                        </span>
                        <span className="text-slate-600 truncate max-w-[200px]">
                          {act.workItem.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate text-[11px]">
                      {parseDetails(act.details)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/work/${act.workItem.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        Inspect <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
