import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

const primaryClasses = [
  "flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5",
  "text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-strong",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

const secondaryClasses = [
  "flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-panel-raised px-4 py-2.5",
  "text-sm font-semibold text-ink transition-colors hover:border-ink-faint",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

interface ButtonStyleProps {
  variant?: "primary" | "secondary";
}

function buttonClasses(variant: ButtonStyleProps["variant"]): string {
  return variant === "secondary" ? secondaryClasses : primaryClasses;
}

export function Button({ className, variant, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps) {
  return <button type={type} className={cn(buttonClasses(variant), className)} {...props} />;
}

export function ButtonLink({ className, variant, ...props }: ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={cn(buttonClasses(variant), className)} {...props} />;
}
