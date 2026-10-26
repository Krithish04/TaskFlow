import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { requireProjectAccess } from "@/lib/permissions";
import { ProjectAnalyticsView } from "@/components/analytics/project-analytics-view";

interface AnalyticsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${id}/analytics`);
  }

  let projectKey = "TASK";
  let projectColor = "indigo";

  try {
    const { project } = await requireProjectAccess(id, "view");
    projectKey = project.key || "TASK";
    projectColor = project.color || "indigo";
  } catch {
    notFound();
  }

  return (
    <div className="py-4 sm:py-6">
      <ProjectAnalyticsView
        projectId={id}
        projectKey={projectKey}
        projectColor={projectColor}
      />
    </div>
  );
}
