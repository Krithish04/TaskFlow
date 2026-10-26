import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { requireProjectAccess } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

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

  try {
    await requireProjectAccess(id, "view");
  } catch {
    notFound();
  }

  return (
    <div className="py-8">
      <EmptyState
        icon={BarChart3}
        title="Project Analytics"
        description="Comprehensive project health, burndown charts, workload distribution, and velocity KPIs."
      />
    </div>
  );
}
