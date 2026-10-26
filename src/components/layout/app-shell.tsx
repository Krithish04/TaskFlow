"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Search,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { getProjectColor } from "@/lib/design-tokens";

export interface ShellProject {
  id: string;
  name: string;
  color?: string;
  key?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface AppShellUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}

export interface AppShellProps {
  user: AppShellUser;
  projects?: ShellProject[];
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  user,
  projects = [],
  breadcrumbs,
  actions,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile sidebar on route change during render
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    user.role === "admin"
      ? "Admin"
      : user.role === "pm"
      ? "PM"
      : "Member";

  const defaultBreadcrumbs: BreadcrumbItem[] = breadcrumbs || [
    { label: "Dashboard", href: "/dashboard" },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between py-4">
      <div className="space-y-6 px-3">
        {/* Brand / Logo */}
        <div className="flex items-center justify-between px-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CheckSquare className="size-4" />
            </span>
            <span className="text-base font-bold">TaskFlow</span>
          </Link>
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Platform
          </div>
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors",
              pathname === "/dashboard"
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <LayoutDashboard className="size-4 shrink-0" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Projects List */}
        {projects.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Projects
              </span>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {projects.length}
              </span>
            </div>
            <div className="space-y-0.5 max-h-64 overflow-y-auto no-scrollbar pr-1">
              {projects.map((p) => {
                const isCurrent = pathname.startsWith(`/projects/${p.id}`);
                const colorConfig = getProjectColor(p.color);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors group",
                      isCurrent
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0 transition-transform group-hover:scale-125",
                        colorConfig.dotClass
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate flex-1">{p.name}</span>
                    {p.key && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {p.key}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Section in Sidebar */}
      <div className="border-t border-border px-3 pt-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground leading-tight">
                {user.name || "User"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" size="sm" className="px-1.5 py-0 text-[10px]">
                  {roleLabel}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            aria-label="Sign out"
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Fixed Sidebar (240px per DESIGN.md) */}
      <aside className="hidden lg:block w-[240px] shrink-0 border-r border-border bg-sidebar">
        <div className="sticky top-0 h-screen overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer (Collapsible on mobile) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-64 max-w-[80vw] bg-sidebar border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar per DESIGN.md */}
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="size-4" />
            </Button>

            {/* Breadcrumb Navigation */}
            <nav
              aria-label="Breadcrumbs"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground overflow-hidden whitespace-nowrap"
            >
              <Link
                href="/dashboard"
                className="hover:text-foreground transition-colors shrink-0"
              >
                TaskFlow
              </Link>
              {defaultBreadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                  {crumb.href && idx < defaultBreadcrumbs.length - 1 ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-semibold truncate max-w-[140px] sm:max-w-[240px]">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right Top Bar: Search Placeholder, Actions, ThemeToggle, User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Search Placeholder per DESIGN.md */}
            <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors">
              <Search className="size-3.5" />
              <span>Search...</span>
              <kbd className="pointer-events-none rounded bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border">
                ⌘K
              </kbd>
            </div>

            {actions}

            <ThemeToggle />

            {/* User profile dropdown / signout */}
            <div className="hidden sm:flex items-center gap-2 border-l border-border pl-3">
              <Avatar size="sm">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-foreground max-w-[100px] truncate">
                {user.name || "User"}
              </span>
            </div>
          </div>
        </header>

        {/* Content Container (max width 1280px per DESIGN.md) */}
        <main className="flex-1 min-w-0 py-6 px-4 sm:px-6 lg:px-8 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
