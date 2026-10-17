"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, UserPlus, Clock, ShieldAlert } from "lucide-react";
import { WorkItemPriorityBadge } from "../work-items/WorkItemPriorityBadge";
import { WorkItemStatusBadge } from "../work-items/WorkItemStatusBadge";

interface Props {
  items: any[];
  onItemClaimed?: () => void;
}

export function AttentionRequired({ items, onItemClaimed }: Props) {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleQuickClaim(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setClaimingId(id);
    setClaimError(null);

    try {
      const res = await fetch(`/api/work-items/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `quick_claim_${id}_${Date.now()}` }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to claim work item");
      }

      if (onItemClaimed) {
        onItemClaimed();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setClaimError(err.message || "Failed to claim item");
      alert(err.message);
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Attention Required (Highest Operational Pressure)
          </h2>
        </div>
        <Link
          href="/work"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
        >
          View all work <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
          No items currently require urgent attention. All SLAs healthy!
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {item.key}
                  </span>
                  <WorkItemPriorityBadge priority={item.priority} size="sm" />
                  <WorkItemStatusBadge status={item.status} size="sm" />
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {item.team?.name || "Team"}
                  </span>
                  {item.requiresApproval && item.approvalStatus === "PENDING" && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      Approval Needed
                    </span>
                  )}
                </div>

                <Link
                  href={`/work/${item.id}`}
                  className="text-xs font-semibold text-slate-800 hover:text-blue-600 truncate block transition-colors"
                >
                  {item.title}
                </Link>

                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>
                    Owner:{" "}
                    <strong className="text-slate-700 font-medium">
                      {item.assignee ? item.assignee.name : "Unassigned"}
                    </strong>
                  </span>
                  {item.dueDate && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!item.assigneeId ? (
                  <button
                    onClick={(e) => handleQuickClaim(item.id, e)}
                    disabled={claimingId === item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                    title="Atomically claim this unassigned item"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{claimingId === item.id ? "Claiming..." : "Claim"}</span>
                  </button>
                ) : (
                  <Link
                    href={`/work/${item.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Review
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
