"use client";

import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckSquare, Loader2, Sparkles } from "lucide-react";
import { loginAction } from "./actions";

interface LoginFormProps {
  callbackUrl?: string;
  initialError?: string;
}

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@example.com", badge: "All Access" },
  { role: "Project Manager", email: "pm@example.com", badge: "Project Lead" },
  { role: "Member (Alice)", email: "alice@example.com", badge: "Team Member" },
  { role: "Member (Bob)", email: "bob@example.com", badge: "Team Member" },
];

export function LoginForm({ callbackUrl = "/dashboard", initialError }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const errorMessage =
    state?.error ||
    (initialError === "CredentialsSignin"
      ? "Invalid email or password."
      : initialError
      ? "Sign in failed. Please try again."
      : null);

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/80">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md mb-2">
          <CheckSquare className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Welcome to TaskFlow
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Sign in to access your projects, tasks, and AI workspace.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
              disabled={isPending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isPending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-medium"
            disabled={isPending}
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="flex flex-col space-y-3 pt-2 pb-6 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground self-start mt-2">
          <Sparkles className="size-3.5 text-primary" />
          <span>Demo Accounts (click to auto-fill)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemoAccount(account.email)}
              disabled={isPending}
              className="flex flex-col items-start rounded-lg border border-border bg-muted/30 p-2 text-left text-xs transition-colors hover:bg-muted/70 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium text-foreground">{account.role}</span>
              <span className="text-[11px] text-muted-foreground truncate w-full">
                {account.email}
              </span>
            </button>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
