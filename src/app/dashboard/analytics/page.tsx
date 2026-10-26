import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { AppShell } from "@/components/layout/app-shell";
import { GlobalAnalyticsView } from "@/components/analytics/global-analytics-view";
import { getGlobalAnalytics } from "@/lib/analytics";

export const metadata = {
  title: "Global Analytics - TaskFlow",
  description: "Cross-project portfolio health, progress metrics, and team workload analytics.",
};

export const instant = false;

export default async function GlobalAnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "admin" && role !== "pm") {
    // Anti-probing: regular members do not have access to global analytics
    notFound();
  }

  await connectDB();

  // Load sidebar projects accessible by the user
  const sidebarProjectsDoc = await Project.find(
    role === "admin"
      ? {}
      : { $or: [{ owner: session.user.id }, { members: session.user.id }] },
    "name key color"
  )
    .sort({ name: 1 })
    .lean();

  const sidebarProjects = sidebarProjectsDoc.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    key: p.key,
    color: p.color,
  }));

  // Server-rendered initial global analytics
  const initialAnalytics = await getGlobalAnalytics(session.user.id, role);

  return (
    <AppShell
      user={session.user}
      projects={sidebarProjects}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Portfolio Analytics" },
      ]}
    >
      <GlobalAnalyticsView
        initialData={initialAnalytics}
        userRole={role}
      />
    </AppShell>
  );
}
