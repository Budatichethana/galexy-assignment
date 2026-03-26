"use client";

interface StatusDotProps {
  status: "success" | "failed" | "running";
  size?: "sm" | "md";
}

export function StatusDot({ status, size = "md" }: StatusDotProps) {
  const sizeClass = size === "sm" ? "h-2 w-2" : "h-3 w-3";

  const colorClass = {
    success: "bg-emerald-500",
    failed: "bg-red-500",
    running: "bg-yellow-500 animate-pulse",
  }[status];

  return <div className={`rounded-full ${sizeClass} ${colorClass}`} />;
}
