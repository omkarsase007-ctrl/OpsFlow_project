import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { WorkItemService } from "@/lib/services/work-item.service";
import { WorkItemFilters } from "@/components/work-items/WorkItemFilters";
import { WorkItemTable } from "@/components/work-items/WorkItemTable";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    priority?: string;
    type?: string;
    teamId?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export default async function MyWorkPage({ searchParams }: Props) {
  const user = await getCurrentUser();

  const page = parseInt(searchParams.page || "1", 10);
  const pageSize = parseInt(searchParams.pageSize || "10", 10);
  const search = searchParams.search;
  const status = searchParams.status as any;
  const priority = searchParams.priority as any;
  const type = searchParams.type as any;
  const teamId = searchParams.teamId;
  const sortBy = (searchParams.sortBy as any) || "updatedAt";
  const sortOrder = (searchParams.sortOrder as any) || "desc";

  const response = await WorkItemService.listWorkItems(user, {
    page,
    pageSize,
    search,
    status,
    priority,
    type,
    teamId,
    assigneeId: user.id, // Strictly scoped to current user!
    sortBy,
    sortOrder,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          My Work Responsibilities
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Work items directly claimed by or assigned to <strong>{user.name}</strong>.
        </p>
      </div>

      <WorkItemFilters
        initialSearch={search}
        initialStatus={status}
        initialPriority={priority}
        initialType={type}
        initialTeamId={teamId}
        initialAssigneeId={user.id}
        initialSortBy={sortBy}
        initialSortOrder={sortOrder}
      />

      <WorkItemTable response={response} />
    </div>
  );
}
