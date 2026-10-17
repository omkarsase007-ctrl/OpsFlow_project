"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  WorkItemWithRelations,
  PaginatedResponse,
} from "@/lib/types";
import { WorkItemStatusBadge } from "./WorkItemStatusBadge";
import { WorkItemPriorityBadge } from "./WorkItemPriorityBadge";
import { WorkItemTypeBadge } from "./WorkItemTypeBadge";
import {
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Clock,
  Inbox,
} from "lucide-react";

interface Props {
  response: PaginatedResponse<WorkItemWithRelations>;
}

export function WorkItemTable({ response }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { data: items, pagination } = response;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  async function handleQuickClaim(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setClaimingId(id);

    try {
      const res = await fetch(`/api/work-items/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `table_claim_${id}_${Date.now()}` }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to claim work item");
      }

      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to claim item");
    } finally {
      setClaimingId(null);
    }
  }

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Item & Key</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Team</th>
              <th className="py-3 px-4">Assignee</th>
              <th className="py-3 px-4">Updated</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600 text-sm">No work items found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try clearing or adjusting your search and filter criteria.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/work/${item.id}`)}
                >
                  {/* Key & Title */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 flex-shrink-0">
                        {item.key}
                      </span>
                      <span className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </span>
                      {item.requiresApproval && item.approvalStatus === "PENDING" && (
                        <span
                          className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"
                          title="Approval Pending"
                        />
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <WorkItemTypeBadge type={item.type} />
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <WorkItemPriorityBadge priority={item.priority} size="sm" />
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <WorkItemStatusBadge status={item.status} size="sm" />
                  </td>

                  {/* Team */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-slate-600 font-medium">
                      {item.team?.name || "General"}
                    </span>
                  </td>

                  {/* Assignee */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-semibold">
                          {item.assignee.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800">{item.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Updated */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                    {formatRelativeTime(item.updatedAt)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {!item.assigneeId ? (
                        <button
                          onClick={(e) => handleQuickClaim(item.id, e)}
                          disabled={claimingId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                          title="Claim item immediately"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>{claimingId === item.id ? "..." : "Claim"}</span>
                        </button>
                      ) : null}

                      <Link
                        href={`/work/${item.id}`}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.total > 0 && (
        <div className="p-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <div>
            Showing{" "}
            <strong>
              {(pagination.page - 1) * pagination.pageSize + 1}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </strong>{" "}
            of <strong>{pagination.total}</strong> work items
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-medium text-slate-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
