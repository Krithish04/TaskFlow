import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In - TaskFlow",
  description: "Sign in to your TaskFlow account to manage projects and tasks.",
};

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
  const callbackUrl = resolvedParams.callbackUrl || "/dashboard";
  const error = resolvedParams.error;

  return (
    <div className="flex min-h-[calc(100vh-8.5rem)] flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-muted/20">
      <LoginForm callbackUrl={callbackUrl} initialError={error} />
    </div>
  );
}
