"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CheckSquare,
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronsUpDown,
  BarChart3,
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
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProjects = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.key && p.key.toLowerCase().includes(q))
    );
  }, [searchQuery, projects]);

  // Close mobile sidebar on route change during render
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setSwitcherOpen(false);
  }

  const currentProjectId = pathname.match(/^\/projects\/([a-f0-9]{24})/)?.[1];
  const activeProject = projects.find((p) => p.id === currentProjectId);

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

          <Link
            href="/projects"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors",
              pathname === "/projects"
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <FolderKanban className="size-4 shrink-0" />
            <span>Projects</span>
          </Link>

          {(user.role === "admin" || user.role === "pm") && (
            <Link
              href="/dashboard/analytics"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors",
                pathname === "/dashboard/analytics"
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <BarChart3 className="size-4 shrink-0" />
              <span>Analytics</span>
            </Link>
          )}
        </div>

        {/* Projects & Project Switcher */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Workspace
              </span>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {projects.length}
              </span>
            </div>

            {/* Project Switcher Dropdown */}
            <div className="relative px-1">
              <button
                type="button"
                onClick={() => setSwitcherOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-left text-xs transition-colors shadow-xs"
                aria-label="Switch project"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "size-2.5 rounded-full shrink-0",
                      getProjectColor(activeProject?.color).dotClass
                    )}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate leading-tight">
                      {activeProject ? activeProject.name : "Switch Project..."}
                    </p>
                    {activeProject?.key && (
                      <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                        {activeProject.key}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
              </button>

              {switcherOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setSwitcherOpen(false)}
                  />
                  <div className="absolute top-full left-1 right-1 z-40 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg space-y-0.5">
                    {projects.map((p) => {
                      const isSelected = p.id === currentProjectId;
                      const c = getProjectColor(p.color);
                      return (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}/overview`}
                          onClick={() => setSwitcherOpen(false)}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                            isSelected
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("size-2 rounded-full shrink-0", c.dotClass)} />
                            <span className="truncate">{p.name}</span>
                          </div>
                          {p.key && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {p.key}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                    <div className="border-t border-border pt-1 mt-1">
                      <Link
                        href="/projects"
                        onClick={() => setSwitcherOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-primary font-medium hover:bg-muted"
                      >
                        <FolderKanban className="size-3.5" />
                        <span>All Projects</span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Project List */}
            <div className="space-y-0.5 max-h-48 overflow-y-auto no-scrollbar pr-1 pt-1">
              {projects.map((p) => {
                const isCurrent = currentProjectId === p.id;
                const colorConfig = getProjectColor(p.color);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/overview`}
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
                        colorConfig.dotClass,
                        isCurrent && "ring-2 ring-primary ring-offset-1"
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
            {/* Functional Search Input (without icon or shortcut key badge) */}
            <div ref={searchContainerRef} className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (filteredProjects.length > 0) {
                      router.push(`/projects/${filteredProjects[0].id}/overview`);
                    } else if (searchQuery.trim()) {
                      router.push(`/projects`);
                    }
                    setSearchOpen(false);
                    setSearchQuery("");
                  } else if (e.key === "Escape") {
                    setSearchOpen(false);
                  }
                }}
                aria-label="Search"
                className="h-8 w-36 rounded-md border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:w-56 focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />

              {searchOpen && searchQuery.trim() && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-md border border-border bg-popover p-1.5 shadow-lg animate-in fade-in-50 zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Projects ({filteredProjects.length})
                  </div>
                  {filteredProjects.length > 0 ? (
                    <div className="space-y-0.5 max-h-56 overflow-y-auto">
                      {filteredProjects.map((p) => {
                        const color = getProjectColor(p.color);
                        return (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}/overview`}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="size-2 rounded-full shrink-0"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="font-medium truncate">{p.name}</span>
                            </div>
                            {p.key && (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-mono px-1 py-0 h-4 shrink-0"
                              >
                                {p.key}
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                      No matching projects found
                    </div>
                  )}
                </div>
              )}
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
