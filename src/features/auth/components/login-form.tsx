"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { setStoredUser, setToken } from "@/lib/auth/token-storage";
import { humanizeErrorCode } from "@/lib/errors/error-messages";
import type { ApiErrorBody } from "@/lib/api/response";
import type { LoginResult } from "../auth-types";

type FieldErrors = Record<string, string>;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();

      if (!response.ok) {
        applyErrors(body?.error, setFormError, setFieldErrors);
        return;
      }

      const result = body as LoginResult;
      setToken(result.accessToken);
      setStoredUser(result.user);
      router.push("/");
    } catch {
      setFormError(humanizeErrorCode("general.error.server_error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="space-y-6">
      <header className="space-y-1 text-center">
        <p className="text-sm font-semibold tracking-wide text-ink-faint">PIRANHA</p>
        <h1 className="text-xl font-bold text-ink">Welcome Back</h1>
        <p className="text-sm text-ink-muted">Sign in to continue</p>
      </header>

      {formError ? <Alert>{formError}</Alert> : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-[34px] right-3 text-sm text-ink-faint transition-colors hover:text-ink-muted"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" />
              Signing In…
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Card>
  );
}

function applyErrors(
  errors: ApiErrorBody[] | undefined,
  setFormError: (message: string | null) => void,
  setFieldErrors: (errors: FieldErrors) => void,
): void {
  const fields: FieldErrors = {};
  let general: string | null = null;

  for (const item of errors ?? []) {
    const [target] = item.path;
    if (target === "general") {
      general = humanizeErrorCode(item.message);
    } else {
      fields[target] = humanizeErrorCode(item.message);
    }
  }

  setFieldErrors(fields);
  setFormError(general);
}
