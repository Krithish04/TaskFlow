import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { requireProjectAccess } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

export const instant = false;

interface MembersPageProps {
  params: Promise<{ id: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${id}/members`);
  }

  try {
    await requireProjectAccess(id, "view");
  } catch {
    notFound();
  }

  await connectDB();

  const project = await Project.findById(id).lean();
  if (!project) {
    notFound();
  }

  const isSuperAdmin = session.user.role === "admin";
  const isProjectOwner = project.owner.toString() === session.user.id;

  // PRD: Members tab is PM and Admin only. Return 404 for unauthorized users
  if (!isSuperAdmin && !isProjectOwner) {
    notFound();
  }

  return (
    <div className="py-8">
      <EmptyState
        icon={Users}
        title="Project Members Management"
        description="Add and manage team members, roles, and project permissions."
      />
    </div>
  );
}
