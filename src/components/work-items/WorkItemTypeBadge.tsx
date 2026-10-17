import React from "react";
import { WorkType } from "@/lib/types";
import {
  AlertTriangle,
  LifeBuoy,
  Cpu,
  CreditCard,
  ShieldCheck,
  Layers,
} from "lucide-react";

interface Props {
  type: WorkType | string;
}

export function WorkItemTypeBadge({ type }: Props) {
  const getConfig = () => {
    switch (type) {
      case "INCIDENT":
        return {
          label: "Incident",
          style: "bg-red-50 text-red-800 border-red-200",
          icon: <AlertTriangle className="w-3 h-3 text-red-600" />,
        };
      case "CUSTOMER_ISSUE":
        return {
          label: "Customer Issue",
          style: "bg-sky-50 text-sky-800 border-sky-200",
          icon: <LifeBuoy className="w-3 h-3 text-sky-600" />,
        };
      case "ENGINEERING_TASK":
        return {
          label: "Engineering Task",
          style: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: <Cpu className="w-3 h-3 text-indigo-600" />,
        };
      case "PAYMENT_INVESTIGATION":
        return {
          label: "Payment Investigation",
          style: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CreditCard className="w-3 h-3 text-emerald-600" />,
        };
      case "COMPLIANCE_REQUEST":
        return {
          label: "Compliance Request",
          style: "bg-purple-50 text-purple-800 border-purple-200",
          icon: <ShieldCheck className="w-3 h-3 text-purple-600" />,
        };
      case "GENERAL_OPERATIONS":
      default:
        return {
          label: "Operations",
          style: "bg-slate-50 text-slate-800 border-slate-200",
          icon: <Layers className="w-3 h-3 text-slate-600" />,
        };
    }
  };

  const { label, style, icon } = getConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${style}`}
    >
      {icon}
      {label}
    </span>
  );
}
