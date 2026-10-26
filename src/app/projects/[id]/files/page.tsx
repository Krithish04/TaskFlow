import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { requireProjectAccess } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

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

  try {
    await requireProjectAccess(id, "view");
  } catch {
    notFound();
  }

  return (
    <div className="py-8">
      <EmptyState
        icon={FileText}
        title="Project Files"
        description="Secure document and file storage for attachments, specifications, and assets."
      />
    </div>
  );
}
