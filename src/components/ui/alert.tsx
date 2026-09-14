import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "info";
}

export function Alert({ variant = "error", className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
        variant === "error" && "border-down/40 bg-down/10 text-down",
        variant === "info" && "border-info/40 bg-info/10 text-info",
        className,
      )}
      {...props}
    />
  );
}
