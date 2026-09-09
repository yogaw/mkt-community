"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, ...props },
  ref,
) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-muted">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full rounded-lg border border-edge bg-panel-raised px-3 py-2.5 text-sm text-ink",
          "placeholder:text-ink-faint focus:border-accent focus:outline-none",
          error && "border-down focus:border-down",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-down">{error}</p> : null}
    </div>
  );
});
