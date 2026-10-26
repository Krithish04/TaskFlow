import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { requireProjectAccess } from "@/lib/permissions";
import { FilesView } from "@/components/files/files-view";

interface FilesPageProps {
  params: Promise<{ id: string }>;
}

export default async function FilesPage({ params }: FilesPageProps) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${id}/files`);
  }

  let projectOwnerId = "";
  let projectKey = "";

  try {
    const { project } = await requireProjectAccess(id, "view");
    projectOwnerId = project.owner?.toString() || "";
    projectKey = project.key || "";
  } catch {
    notFound();
  }

  return (
    <div className="py-2">
      <FilesView
        projectId={id}
        projectKey={projectKey}
        projectOwnerId={projectOwnerId}
        currentUser={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
      />
    </div>
  );
}
