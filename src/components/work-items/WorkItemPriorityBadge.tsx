import React from "react";
import { WorkPriority } from "@/lib/types";
import { AlertCircle, ArrowUp, ArrowDown, Flame } from "lucide-react";

interface Props {
  priority: WorkPriority | string;
  size?: "sm" | "md";
}

export function WorkItemPriorityBadge({ priority, size = "md" }: Props) {
  const getBadgeConfig = () => {
    switch (priority) {
      case "CRITICAL":
        return {
          style: "bg-red-50 text-red-700 border-red-200 font-semibold",
          icon: <Flame className="w-3.5 h-3.5 text-red-600 animate-pulse" />,
        };
      case "HIGH":
        return {
          style: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "MEDIUM":
        return {
          style: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <AlertCircle className="w-3.5 h-3.5 text-blue-600" />,
        };
      case "LOW":
        return {
          style: "bg-slate-50 text-slate-600 border-slate-200",
          icon: <ArrowDown className="w-3.5 h-3.5 text-slate-500" />,
        };
      default:
        return {
          style: "bg-gray-50 text-gray-600 border-gray-200",
          icon: null,
        };
    }
  };

  const { style, icon } = getBadgeConfig();
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border ${style} ${sizeClasses}`}
    >
      {icon}
      {priority}
    </span>
  );
}
