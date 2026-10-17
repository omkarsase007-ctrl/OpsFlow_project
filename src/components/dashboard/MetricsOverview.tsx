import React from "react";
import Link from "next/link";
import {
  Layers,
  Flame,
  UserCheck2,
  AlertOctagon,
  Clock,
  CheckSquare,
} from "lucide-react";

interface MetricsData {
  totalActive: number;
  criticalAndHigh: number;
  assignedToMe: number;
  blockedItems: number;
  overdueItems: number;
  awaitingApproval: number;
}

interface Props {
  metrics: MetricsData;
}

export function MetricsOverview({ metrics }: Props) {
  const cards = [
    {
      label: "Total Active Work",
      value: metrics.totalActive,
      href: "/work?status=OPEN",
      icon: Layers,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      description: "Non-resolved operational items",
    },
    {
      label: "Critical & High Priority",
      value: metrics.criticalAndHigh,
      href: "/work?priority=CRITICAL",
      icon: Flame,
      color: "text-red-600 bg-red-50 border-red-200",
      description: "Severe SLA impact risk",
      alert: metrics.criticalAndHigh > 0,
    },
    {
      label: "Assigned to Me",
      value: metrics.assignedToMe,
      href: "/my-work",
      icon: UserCheck2,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      description: "Your active responsibilities",
    },
    {
      label: "Blocked Work",
      value: metrics.blockedItems,
      href: "/work?status=BLOCKED",
      icon: AlertOctagon,
      color: "text-rose-600 bg-rose-50 border-rose-200",
      description: "Impeded by dependencies",
      alert: metrics.blockedItems > 0,
    },
    {
      label: "Overdue Items",
      value: metrics.overdueItems,
      href: "/work",
      icon: Clock,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      description: "Exceeded target resolution",
      alert: metrics.overdueItems > 0,
    },
    {
      label: "Awaiting Approval",
      value: metrics.awaitingApproval,
      href: "/approvals",
      icon: CheckSquare,
      color: "text-purple-600 bg-purple-50 border-purple-200",
      description: "Requiring lead sign-off",
      highlight: metrics.awaitingApproval > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="group p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${card.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {card.value}
                </span>
                {card.alert && (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    Attention
                  </span>
                )}
                {card.highlight && (
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    Queue
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                {card.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
