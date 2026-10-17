"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  UserCheck2,
  Users2,
  CheckSquare,
  History,
  Settings,
  ShieldAlert,
  Flame,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{ awaitingApproval?: number; criticalCount?: number }>({});

  useEffect(() => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((data) => {
        setCounts({
          awaitingApproval: data.awaitingApproval || 0,
          criticalCount: data.criticalAndHigh || 0,
        });
      })
      .catch(() => {});
  }, [pathname]);

  const navItems = [
    {
      label: "Overview",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      label: "All Work",
      href: "/work",
      icon: Layers,
      active: pathname === "/work" || pathname.startsWith("/work/"),
    },
    {
      label: "My Work",
      href: "/my-work",
      icon: UserCheck2,
      active: pathname === "/my-work",
    },
    {
      label: "Team Work",
      href: "/team-work",
      icon: Users2,
      active: pathname === "/team-work",
    },
    {
      label: "Approvals",
      href: "/approvals",
      icon: CheckSquare,
      active: pathname === "/approvals",
      badge: counts.awaitingApproval && counts.awaitingApproval > 0 ? counts.awaitingApproval : null,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      label: "Activity",
      href: "/activity",
      icon: History,
      active: pathname === "/activity",
    },
    {
      label: "System & Settings",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
          OF
        </div>
        <div>
          <span className="font-bold text-slate-900 tracking-tight text-base flex items-center gap-1.5">
            OpsFlow
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Enterprise
            </span>
          </span>
          <p className="text-[11px] text-slate-400 font-medium">Operations Under Pressure</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </p>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                item.active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${item.active ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ${
                    item.active
                      ? "bg-white text-slate-900 border-transparent"
                      : item.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Live SLA & Concurrency Indicator */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-700">Cluster Status</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
            OCC v1.2
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Optimistic Concurrency & Atomic claim protection active.
        </p>
      </div>
    </aside>
  );
}
