import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Bot, ShieldCheck, Users, CheckSquare } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Public Landing Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-foreground hover:opacity-90 transition-opacity"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CheckSquare className="size-4" />
            </span>
            <span className="text-lg font-bold">TaskFlow</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-block"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ size: "sm" })}
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Role-Based Permissions &bull; Admin, PM & User</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
            Streamlined Project Management with{" "}
            <span className="text-primary underline decoration-primary/40 underline-offset-8">
              AI Superpowers
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Manage projects, collaborate on Kanban boards, track task comments in
            real time, and accelerate your workflow with built-in AI assistance.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", className: "gap-2" })}
            >
              Get Started <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              View Dashboard
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
            <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Users className="size-5" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">
                Role-Based Dashboards
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Dedicated views and permissions tailored for Admins, Project
                Managers, and Team Members.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <KanbanIcon className="size-5" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">
                Interactive Kanban
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Smooth drag-and-drop task organisation across columns with live
                commenting.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Bot className="size-5" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">
                Intelligent Assistant
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                AI task breakdown, natural language task creation, weekly reports,
                and project Q&amp;A.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        TaskFlow &mdash; Project Management with Role-Based Access & AI
      </footer>
    </div>
  );
}

function KanbanIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M8 7v7" />
      <path d="M12 7v4" />
      <path d="M16 7v9" />
    </svg>
  );
}
