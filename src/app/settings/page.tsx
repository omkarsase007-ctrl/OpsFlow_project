import React from "react";
import { getCurrentUser, getAllUsers } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Settings, Shield, Database, Users, Server, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  const allUsers = await getAllUsers();
  const teams = await prisma.team.findMany();
  const totalItems = await prisma.workItem.count();
  const totalActivities = await prisma.activityLog.count();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          System & Engineering Overview
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuration, persona directory, and active architectural invariants.
        </p>
      </div>

      {/* Cluster Health & Architecture Status */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Server className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Platform Invariants & Architecture</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Database Engine</span>
            <span className="text-slate-800 font-bold mt-1 block">Prisma + SQLite</span>
            <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Zero-Setup Local Dev
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Concurrency Model</span>
            <span className="text-slate-800 font-bold mt-1 block">OCC Version Check</span>
            <span className="text-[10px] text-blue-600 mt-0.5 block">HTTP 409 Conflict Guard</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Work Items</span>
            <span className="text-slate-800 font-bold mt-1 block">{totalItems} Records</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Indexed by Status/Team</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Audit Trail</span>
            <span className="text-slate-800 font-bold mt-1 block">{totalActivities} Events</span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Append-Only Transactions</span>
          </div>
        </div>
      </div>

      {/* Role-Based Permissions Reference */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-bold text-slate-900">Role Authorization Matrix</h2>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Team Scope</th>
                <th className="py-2.5 px-3">Work Item Actions</th>
                <th className="py-2.5 px-3">Approvals</th>
                <th className="py-2.5 px-3">Reopen Closed Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-purple-700">ADMIN</td>
                <td className="py-2.5 px-3">Universal (All Teams)</td>
                <td className="py-2.5 px-3">Create, Edit, Claim, Reassign any item</td>
                <td className="py-2.5 px-3 text-emerald-600 font-medium">All Teams</td>
                <td className="py-2.5 px-3 text-emerald-600 font-medium">Allowed</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-blue-700">TEAM_LEAD</td>
                <td className="py-2.5 px-3">Assigned Team</td>
                <td className="py-2.5 px-3">Manage team assignments, triage, transitions</td>
                <td className="py-2.5 px-3 text-emerald-600 font-medium">Own Team Items</td>
                <td className="py-2.5 px-3 text-emerald-600 font-medium">Allowed</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-700">MEMBER</td>
                <td className="py-2.5 px-3">Assigned Team</td>
                <td className="py-2.5 px-3">Create, comment, claim, update assigned work</td>
                <td className="py-2.5 px-3 text-rose-500 font-medium">Forbidden (403)</td>
                <td className="py-2.5 px-3 text-rose-500 font-medium">Forbidden (422)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Persona Directory */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">Seeded Demo Personas (Switch in Top Nav)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {allUsers.map((u) => (
            <div
              key={u.id}
              className={`p-3 rounded-lg border ${
                u.id === currentUser.id
                  ? "bg-blue-50/70 border-blue-200"
                  : "bg-slate-50 border-slate-200/70"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-800">{u.name}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {u.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Team: {u.team?.name || "Global Admin"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
