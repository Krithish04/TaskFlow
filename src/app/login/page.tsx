import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";
import { sanitizeCallbackUrl } from "@/lib/callback-url";
import { CheckSquare, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Sign In - TaskFlow",
  description: "Sign in to your TaskFlow account to manage projects and tasks.",
};

export const instant = false;

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const resolvedParams = (await searchParams) || {};
  const callbackUrl = sanitizeCallbackUrl(resolvedParams.callbackUrl);
  const error = resolvedParams.error;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Header */}
      <header className="h-14 border-b border-border px-4 sm:px-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CheckSquare className="size-4" />
          </span>
          <span className="text-base font-bold">TaskFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Centered Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <LoginForm callbackUrl={callbackUrl} initialError={error} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        TaskFlow &mdash; Secure role-based project management
      </footer>
    </div>
  );
}
