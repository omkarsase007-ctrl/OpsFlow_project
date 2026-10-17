"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  WorkItemWithRelations,
  SessionUser,
  WorkStatus,
  WorkPriority,
  WorkType,
  ActivityAction,
} from "@/lib/types";
import { WorkItemStatusBadge } from "@/components/work-items/WorkItemStatusBadge";
import { WorkItemPriorityBadge } from "@/components/work-items/WorkItemPriorityBadge";
import { WorkItemTypeBadge } from "@/components/work-items/WorkItemTypeBadge";
import { ALLOWED_TRANSITIONS } from "@/lib/workflow";
import {
  ArrowLeft,
  UserCheck,
  UserPlus,
  Clock,
  Shield,
  AlertTriangle,
  History,
  MessageSquare,
  RefreshCw,
  Send,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";

interface Props {
  initialItem: WorkItemWithRelations;
  currentUser: SessionUser;
  teams: any[];
  users: any[];
}

export function WorkItemDetailClient({
  initialItem,
  currentUser,
  teams,
  users,
}: Props) {
  const router = useRouter();
  const [item, setItem] = useState<WorkItemWithRelations>(initialItem);

  // Editable fields
  const [title, setTitle] = useState(initialItem.title);
  const [description, setDescription] = useState(initialItem.description);
  const [status, setStatus] = useState<WorkStatus>(initialItem.status);
  const [priority, setPriority] = useState<WorkPriority>(initialItem.priority);
  const [assigneeId, setAssigneeId] = useState<string>(initialItem.assigneeId || "");
  const [teamId, setTeamId] = useState<string>(initialItem.teamId);

  // Comments
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Save / Action States
  const [isSaving, setIsSaving] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Concurrency Conflict State (OCC)
  const [conflictData, setConflictData] = useState<{
    message: string;
    currentVersion: number;
    currentData: any;
  } | null>(null);

  // Reload latest data from server
  async function reloadLatest() {
    try {
      const res = await fetch(`/api/work-items/${item.id}`);
      if (res.ok) {
        const fresh = await res.json();
        setItem(fresh);
        setTitle(fresh.title);
        setDescription(fresh.description);
        setStatus(fresh.status);
        setPriority(fresh.priority);
        setAssigneeId(fresh.assigneeId || "");
        setTeamId(fresh.teamId);
        setConflictData(null);
        setErrorMessage(null);
        setSuccessMessage("Reloaded newest version from server.");
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch {
      window.location.reload();
    }
  }

  // Update work item (with OCC version check)
  async function handleSave(forcedVersion?: number) {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setConflictData(null);

    const versionToSend = forcedVersion !== undefined ? forcedVersion : item.version;

    try {
      const res = await fetch(`/api/work-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: versionToSend, // REQUIRED for Optimistic Concurrency Control
          title,
          description,
          status,
          priority,
          assigneeId: assigneeId || null,
          teamId,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // CONCURRENCY CONFLICT DETECTED!
        setConflictData({
          message: data.message,
          currentVersion: data.currentVersion,
          currentData: data.currentData,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || "Failed to update work item");
      }

      setItem(data);
      setSuccessMessage(`Successfully updated to Version ${data.version}!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  // Atomic Claim Operation
  async function handleClaim() {
    setIsClaiming(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setConflictData(null);

    try {
      const idempotencyKey = `claim_${item.id}_${currentUser.id}_${Date.now()}`;
      const res = await fetch(`/api/work-items/${item.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setConflictData({
          message: data.message,
          currentVersion: data.currentVersion,
          currentData: data.currentData,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || "Failed to claim work item");
      }

      setItem(data);
      setAssigneeId(currentUser.id);
      setStatus(data.status);
      setSuccessMessage("You have successfully claimed this work item!");
      setTimeout(() => setSuccessMessage(null), 4000);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to claim item");
    } finally {
      setIsClaiming(false);
    }
  }

  // Handle Approval / Rejection
  async function handleApprovalAction(action: "APPROVE" | "REJECT") {
    let reason: string | undefined;
    if (action === "REJECT") {
      const inputReason = window.prompt("Enter rejection reason:");
      if (!inputReason || !inputReason.trim()) return;
      reason = inputReason.trim();
    }

    setIsApproving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/work-items/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Approval action failed");
      }

      setItem(data);
      setSuccessMessage(
        action === "APPROVE"
          ? "Work item approved successfully!"
          : "Work item rejected."
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Action failed");
    } finally {
      setIsApproving(false);
    }
  }

  // Add Comment
  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/work-items/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const commentData = await res.json();
      if (!res.ok) {
        throw new Error(commentData.message || "Failed to add comment");
      }

      setNewComment("");
      // Refresh item to pull new comments & activity logs
      reloadLatest();
    } catch (err: any) {
      alert(err.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  // Allowed next statuses
  const allowedNextStatuses = ALLOWED_TRANSITIONS[item.status] || [];

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/work"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {item.key}
              </span>
              <WorkItemTypeBadge type={item.type} />
              <WorkItemPriorityBadge priority={item.priority} size="sm" />
              <WorkItemStatusBadge status={item.status} size="sm" />

              {/* Version Indicator for Concurrency Control */}
              <span
                className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold"
                title="Optimistic Concurrency Control Version"
              >
                <Lock className="w-3 h-3 text-slate-500" /> v{item.version}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
              {item.title}
            </h1>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {!item.assigneeId && (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isClaiming ? "Claiming..." : "Claim Work Item"}</span>
            </button>
          )}

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* OPTIMISTIC CONCURRENCY CONTROL (OCC) CONFLICT BANNER */}
      {conflictData && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl shadow-md text-xs space-y-3 animate-in zoom-in-95 duration-150">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 text-sm">
                Concurrency Conflict Detected (HTTP 409)
              </h3>
              <p className="text-amber-800 mt-1 leading-relaxed">
                {conflictData.message}
              </p>
              <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-amber-200 text-slate-700 space-y-1">
                <p>
                  <strong>Server Version:</strong> v{conflictData.currentVersion} (Your view was v{item.version})
                </p>
                <p>
                  <strong>Current Title:</strong> {conflictData.currentData?.title}
                </p>
                <p>
                  <strong>Current Status:</strong> {conflictData.currentData?.status} |{" "}
                  <strong>Priority:</strong> {conflictData.currentData?.priority}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1 pl-7">
            <button
              onClick={reloadLatest}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Latest Server Data
            </button>
            <button
              onClick={() => handleSave(conflictData.currentVersion)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Force Apply On Top Of v{conflictData.currentVersion}
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Details, Comments & Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Title & Description */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-slate-900 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Description & Impact
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-700 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* Card: Comments & Collaboration */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Team Collaboration & Comments ({item.comments?.length || 0})
              </h2>
            </div>

            {/* Existing Comments */}
            <div className="space-y-3">
              {item.comments && item.comments.length > 0 ? (
                item.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-[10px]">
                          {comment.author.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {comment.author.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap pl-7 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center italic">
                  No comments yet. Add an update or triage note below.
                </p>
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment or operational update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card: Append-Only Activity Log & History */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Append-Only Activity History ({item.activities?.length || 0})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Immutable Log
              </span>
            </div>

            <div className="space-y-3">
              {item.activities && item.activities.length > 0 ? (
                item.activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800">
                        <strong>{act.actor.name}</strong> performed{" "}
                        <span className="font-semibold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                          {act.action}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5 break-all">
                        {act.details}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No activity records.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Status, Approval, Assignment, Meta */}
        <div className="space-y-5">
          {/* Approval Sign-off Box (If requires approval) */}
          {item.requiresApproval && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-700" />
                <h3 className="text-xs font-bold text-purple-900">
                  Dual-Authorization Workflow
                </h3>
              </div>

              <div className="text-xs text-purple-950 space-y-1">
                <p>
                  Status:{" "}
                  <strong className="uppercase">{item.approvalStatus}</strong>
                </p>
                {item.approvedBy && (
                  <p className="text-[11px] text-purple-700">
                    Signed by: {item.approvedBy.name} on{" "}
                    {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : ""}
                  </p>
                )}
                {item.rejectionReason && (
                  <p className="text-[11px] text-rose-700 font-semibold">
                    Rejection note: {item.rejectionReason}
                  </p>
                )}
              </div>

              {item.approvalStatus === "PENDING" && (
                <div className="pt-2 flex items-center gap-2 border-t border-purple-200">
                  <button
                    onClick={() => handleApprovalAction("REJECT")}
                    disabled={isApproving}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprovalAction("APPROVE")}
                    disabled={isApproving}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 transition-colors shadow-sm disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status & Priority Controls */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Workflow Lifecycle
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Transition
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={item.status}>{item.status} (Current)</option>
                {allowedNextStatuses.map((s) => (
                  <option key={s} value={s}>
                    → Move to {s}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Policy allows transitions: {allowedNextStatuses.join(", ") || "None"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkPriority)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical (Immediate SLA)</option>
              </select>
            </div>
          </div>

          {/* Responsibility & Assignment */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Ownership & Team
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metadata & Concurrency Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs text-slate-500">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              System Audit Metadata
            </h3>
            <p className="flex justify-between">
              <span>Concurrency Version:</span>
              <strong className="font-mono text-slate-800">v{item.version}</strong>
            </p>
            <p className="flex justify-between">
              <span>Creator:</span>
              <strong className="text-slate-800">{item.creator.name}</strong>
            </p>
            <p className="flex justify-between">
              <span>Created At:</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </p>
            <p className="flex justify-between">
              <span>Last Modified:</span>
              <span>{new Date(item.updatedAt).toLocaleTimeString()}</span>
            </p>
            {item.dueDate && (
              <p className="flex justify-between text-amber-700">
                <span>Target SLA Due:</span>
                <strong>{new Date(item.dueDate).toLocaleDateString()}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
