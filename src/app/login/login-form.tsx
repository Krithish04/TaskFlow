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
  { role: "Admin", email: "admin@example.com", badge: "All Access", variant: "default" as const },
  { role: "Project Manager", email: "pm@example.com", badge: "Project Lead", variant: "secondary" as const },
  { role: "Member (Alice)", email: "alice@example.com", badge: "Team Member", variant: "outline" as const },
  { role: "Member (Bob)", email: "bob@example.com", badge: "Team Member", variant: "outline" as const },
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
    <Card className="w-full max-w-md shadow-xs border-border bg-card">
      <CardHeader className="space-y-1.5 text-center pb-5">
        <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-1">
          <CheckSquare className="size-5" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Sign In to TaskFlow
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          Enter your credentials to access your projects and tasks.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
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
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            </div>
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
              className="h-9"
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-medium"
            disabled={isPending}
            size="default"
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

      <CardFooter className="flex flex-col space-y-3 pt-3 pb-5 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground self-start">
          <Sparkles className="size-3 text-primary" />
          <span>Demo Accounts (click to fill)</span>
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
              <div className="flex items-center justify-between w-full mb-0.5">
                <span className="font-semibold text-foreground truncate">{account.role}</span>
              </div>
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
