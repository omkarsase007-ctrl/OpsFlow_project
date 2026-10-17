import React from "react";
import { WorkStatus } from "@/lib/types";

interface Props {
  status: WorkStatus | string;
  size?: "sm" | "md";
}

export function WorkItemStatusBadge({ status, size = "md" }: Props) {
  const getBadgeStyle = () => {
    switch (status) {
      case "OPEN":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "BLOCKED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "IN_REVIEW":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatText = (text: string) => {
    return text.replace(/_/g, " ");
  };

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs font-medium" : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${getBadgeStyle()} ${sizeClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "BLOCKED"
            ? "bg-rose-500 animate-pulse"
            : status === "IN_PROGRESS"
            ? "bg-blue-500"
            : status === "RESOLVED"
            ? "bg-emerald-500"
            : "bg-current opacity-70"
        }`}
      />
      {formatText(status)}
    </span>
  );
}
