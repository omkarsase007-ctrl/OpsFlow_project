"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X, Search, RotateCcw } from "lucide-react";
import { WorkStatus, WorkPriority, WorkType } from "@/lib/types";

interface Props {
  initialSearch?: string;
  initialStatus?: string;
  initialPriority?: string;
  initialType?: string;
  initialTeamId?: string;
  initialAssigneeId?: string;
  initialSortBy?: string;
  initialSortOrder?: string;
}

export function WorkItemFilters(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [search, setSearch] = useState(props.initialSearch || "");
  const [status, setStatus] = useState(props.initialStatus || "ALL");
  const [priority, setPriority] = useState(props.initialPriority || "ALL");
  const [type, setType] = useState(props.initialType || "ALL");
  const [teamId, setTeamId] = useState(props.initialTeamId || "ALL");
  const [assigneeId, setAssigneeId] = useState(props.initialAssigneeId || "ALL");
  const [sortBy, setSortBy] = useState(props.initialSortBy || "updatedAt");
  const [sortOrder, setSortOrder] = useState(props.initialSortOrder || "desc");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setTeams(data.teams || []);
        setUsers(data.users || []);
      })
      .catch(() => {});
  }, []);

  function applyFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    // Merge updates
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === "ALL") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    // Reset to page 1 on filter change
    params.set("page", "1");

    router.push(`?${params.toString()}`);
  }

  function handleReset() {
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    setType("ALL");
    setTeamId("ALL");
    setAssigneeId("ALL");
    setSortBy("updatedAt");
    setSortOrder("desc");
    router.push(window.location.pathname);
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search key, title, or keywords..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applyFilters({ search });
              }
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Quick Filter Selects */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              applyFilters({ status: e.target.value });
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              applyFilters({ priority: e.target.value });
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Type */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              applyFilters({ type: e.target.value });
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Types</option>
            <option value="INCIDENT">Incident</option>
            <option value="CUSTOMER_ISSUE">Customer Issue</option>
            <option value="ENGINEERING_TASK">Engineering Task</option>
            <option value="PAYMENT_INVESTIGATION">Payment Investigation</option>
            <option value="COMPLIANCE_REQUEST">Compliance Request</option>
            <option value="GENERAL_OPERATIONS">General Operations</option>
          </select>

          {/* Team */}
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              applyFilters({ teamId: e.target.value });
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Assignee */}
          <select
            value={assigneeId}
            onChange={(e) => {
              setAssigneeId(e.target.value);
              applyFilters({ assigneeId: e.target.value });
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Assignees</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split(":");
              setSortBy(sb);
              setSortOrder(so);
              applyFilters({ sortBy: sb, sortOrder: so });
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="updatedAt:desc">Sort: Recently Updated</option>
            <option value="createdAt:desc">Sort: Newest First</option>
            <option value="priority:desc">Sort: Highest Priority</option>
            <option value="dueDate:asc">Sort: Nearest Due Date</option>
          </select>

          {/* Reset Filters */}
          <button
            onClick={handleReset}
            title="Reset filters"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
