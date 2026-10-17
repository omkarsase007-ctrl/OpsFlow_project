"use client";

import React, { useState, useEffect, useRef } from "react";
import { SessionUser, Role } from "@/lib/types";
import { UserCheck, ChevronDown, Shield, Users, Award } from "lucide-react";

interface Props {
  initialUser?: SessionUser;
}

export function UserSwitcher({ initialUser }: Props) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(initialUser || null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSession();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.currentUser);
        setAvailableUsers(data.users || []);
      }
    } catch (e) {
      console.error("Failed to load session", e);
    }
  }

  async function handleSwitch(userId: string) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setIsOpen(false);
        // Force full page reload to refresh all server components and data
        window.location.reload();
      }
    } catch (e) {
      console.error("Switch failed", e);
    } finally {
      setIsLoading(false);
    }
  }

  const getRoleBadge = (role: Role | string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-2.5 h-2.5" /> Admin
          </span>
        );
      case "TEAM_LEAD":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Award className="w-2.5 h-2.5" /> Team Lead
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Users className="w-2.5 h-2.5" /> Member
          </span>
        );
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white shadow-sm transition-all text-left"
        title="Switch persona for role & authorization testing"
      >
        <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-medium text-xs overflow-hidden flex-shrink-0">
          {currentUser.name.charAt(0)}
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800">{currentUser.name}</span>
            {getRoleBadge(currentUser.role)}
          </div>
          <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
            {currentUser.teamName || "Global / Unassigned"}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
            <p className="text-xs font-semibold text-slate-800">Switch Persona (Interview Demo)</p>
            <p className="text-[11px] text-slate-500">
              Test multi-user permissions, claims, and approvals seamlessly.
            </p>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto">
            {availableUsers.map((u) => {
              const isSelected = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSwitch(u.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    isSelected
                      ? "bg-blue-50 border border-blue-200 text-blue-900"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center font-medium text-[11px] flex-shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {u.team?.name || "Global Admin"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {getRoleBadge(u.role)}
                    {isSelected && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
