import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SearchInput({ className, ...props }: SearchInputProps) {
  return (
    <input
      type="search"
      className={cn(
        "w-full rounded-lg border border-edge bg-panel-raised px-4 py-2.5 text-sm text-ink",
        "placeholder:text-ink-faint focus:border-accent focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
