import React from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { WorkItemService } from "@/lib/services/work-item.service";
import { prisma } from "@/lib/prisma";
import { WorkItemDetailClient } from "./WorkItemDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function WorkItemDetailPage({ params }: Props) {
  const user = await getCurrentUser();

  let item;
  try {
    item = await WorkItemService.getWorkItemById(params.id, user);
  } catch (err: any) {
    if (err.name === "NotFoundError" || err.message?.includes("not found")) {
      notFound();
    }
    throw err;
  }

  const [teams, users] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <WorkItemDetailClient
      initialItem={item}
      currentUser={user}
      teams={teams}
      users={users}
    />
  );
}
