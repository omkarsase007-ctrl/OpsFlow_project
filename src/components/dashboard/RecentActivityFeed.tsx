import React from "react";
import Link from "next/link";
import {
  History,
  FilePlus,
  UserCheck,
  CheckCircle,
  XCircle,
  MessageSquare,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { ActivityAction } from "@/lib/types";

interface ActivityItem {
  id: string;
  action: ActivityAction | string;
  details: string;
  createdAt: string | Date;
  actor: {
    id: string;
    name: string;
  };
  workItem: {
    id: string;
    key: string;
    title: string;
  };
}

interface Props {
  activities: ActivityItem[];
}

export function RecentActivityFeed({ activities }: Props) {
  const getActionConfig = (action: string) => {
    switch (action) {
      case "CREATED":
        return {
          icon: <FilePlus className="w-3.5 h-3.5 text-blue-600" />,
          label: "created",
          bg: "bg-blue-50 border-blue-200",
        };
      case "ASSIGNED":
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
          label: "claimed / assigned",
          bg: "bg-emerald-50 border-emerald-200",
        };
      case "STATUS_CHANGED":
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-600" />,
          label: "changed status",
          bg: "bg-amber-50 border-amber-200",
        };
      case "PRIORITY_CHANGED":
        return {
          icon: <Sliders className="w-3.5 h-3.5 text-red-600" />,
          label: "updated priority",
          bg: "bg-red-50 border-red-200",
        };
      case "APPROVED":
        return {
          icon: <CheckCircle className="w-3.5 h-3.5 text-purple-600" />,
          label: "approved",
          bg: "bg-purple-50 border-purple-200",
        };
      case "REJECTED":
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
          label: "rejected",
          bg: "bg-rose-50 border-rose-200",
        };
      case "COMMENT_ADDED":
        return {
          icon: <MessageSquare className="w-3.5 h-3.5 text-sky-600" />,
          label: "commented on",
          bg: "bg-sky-50 border-sky-200",
        };
      default:
        return {
          icon: <History className="w-3.5 h-3.5 text-slate-600" />,
          label: "updated",
          bg: "bg-slate-50 border-slate-200",
        };
    }
  };

  const formatRelativeTime = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const parseDetails = (detailsStr: string) => {
    try {
      const data = JSON.parse(detailsStr);
      if (data.from && data.to) {
        return `${data.from} → ${data.to}`;
      }
      if (data.message) {
        return data.message;
      }
      if (data.assignedTo) {
        return `Assigned to ${data.assignedTo}`;
      }
      if (data.snippet) {
        return `"${data.snippet}"`;
      }
      return null;
    } catch {
      return detailsStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Recent Activity History
          </h2>
        </div>
        <Link
          href="/activity"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          View audit log
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No activity logs recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => {
            const config = getActionConfig(item.action);
            const extra = parseDetails(item.details);
            return (
              <div key={item.id} className="flex items-start gap-3 text-xs">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border flex-shrink-0 mt-0.5 ${config.bg}`}
                >
                  {config.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-900">{item.actor.name}</span>{" "}
                    <span className="text-slate-500">{config.label}</span>{" "}
                    <Link
                      href={`/work/${item.workItem.id}`}
                      className="font-mono font-semibold text-blue-600 hover:underline"
                    >
                      {item.workItem.key}
                    </Link>
                  </p>
                  {extra && (
                    <p className="text-[11px] text-slate-500 mt-0.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block">
                      {extra}
                    </p>
                  )}
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
