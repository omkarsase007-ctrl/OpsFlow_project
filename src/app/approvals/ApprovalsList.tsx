"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SessionUser } from "@/lib/types";
import { WorkItemPriorityBadge } from "@/components/work-items/WorkItemPriorityBadge";
import { WorkItemStatusBadge } from "@/components/work-items/WorkItemStatusBadge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  History,
  Lock,
} from "lucide-react";

interface Props {
  user: SessionUser;
  pendingItems: any[];
  historyItems: any[];
}

export function ApprovalsList({ user, pendingItems, historyItems }: Props) {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Check if current user has approval authority for the item
  const canApprove = (item: any) => {
    if (user.role === "ADMIN") return true;
    if (user.role === "TEAM_LEAD" && user.teamId === item.teamId) return true;
    return false;
  };

  async function handleApprove(id: string) {
    setProcessingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/work-items/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", reason: "Approved via Approvals Queue" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to approve item");
      }
      window.location.reload();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Please state the reason for rejection:");
    if (!reason || !reason.trim()) return;

    setProcessingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/work-items/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reject item");
      }
      window.location.reload();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 relative transition-colors ${
            activeTab === "pending"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Pending Review ({pendingItems.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 relative transition-colors ${
            activeTab === "history"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Approval History ({historyItems.length})
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      {activeTab === "pending" ? (
        <div className="space-y-3">
          {pendingItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">All caught up!</p>
              <p className="text-slate-400 mt-1">There are no pending approval requests at this time.</p>
            </div>
          ) : (
            pendingItems.map((item) => {
              const eligible = canApprove(item);
              const isProcessing = processingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {item.key}
                      </span>
                      <WorkItemPriorityBadge priority={item.priority} size="sm" />
                      <WorkItemStatusBadge status={item.status} size="sm" />
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        Approval Required
                      </span>
                      <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                        {item.team?.name}
                      </span>
                    </div>

                    <Link
                      href={`/work/${item.id}`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 truncate block transition-colors"
                    >
                      {item.title}
                    </Link>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {item.description}
                    </p>

                    <p className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                      <span>Submitted by: <strong>{item.creator?.name}</strong></span>
                      <span>•</span>
                      <span>Assignee: <strong>{item.assignee?.name || "Unassigned"}</strong></span>
                    </p>
                  </div>

                  {/* Authorization-Guarded Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-0">
                    {eligible ? (
                      <>
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={isProcessing}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{isProcessing ? "Processing..." : "Approve Sign-off"}</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs" title="Only Team Lead or Admin can approve this request">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Requires {item.team?.name} Lead or Admin</span>
                      </div>
                    )}

                    <Link
                      href={`/work/${item.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-slate-700">{item.key}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.approvalStatus === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {item.approvalStatus}
                  </span>
                  <span className="text-slate-500">{item.team?.name}</span>
                </div>
                <Link
                  href={`/work/${item.id}`}
                  className="font-semibold text-slate-800 hover:text-blue-600"
                >
                  {item.title}
                </Link>
                {item.approvedBy && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Decided by {item.approvedBy.name} on {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                )}
                {item.rejectionReason && (
                  <p className="text-[11px] text-rose-600 mt-0.5 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 inline-block">
                    Reason: {item.rejectionReason}
                  </p>
                )}
              </div>

              <Link
                href={`/work/${item.id}`}
                className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
