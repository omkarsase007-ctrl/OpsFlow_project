"use client";

import React, { useState } from "react";
import { Search, Plus, Bell, Radio } from "lucide-react";
import { UserSwitcher } from "./UserSwitcher";
import { CreateWorkItemModal } from "../work-items/CreateWorkItemModal";
import { useRouter } from "next/navigation";

export function TopNav() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/work?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/work");
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm/50">
        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search key (OPS-1001), incident, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
          />
        </form>

        {/* Right Section: Actions & Persona Switcher */}
        <div className="flex items-center gap-3">
          {/* Quick Create Work Item */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Work Item</span>
          </button>

          {/* System SLA Live Indicator */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px]"
            title="Real-time operations sync active"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-700">Cluster Live</span>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* User Persona & Role Switcher */}
          <UserSwitcher />
        </div>
      </header>

      {/* Modal */}
      <CreateWorkItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
