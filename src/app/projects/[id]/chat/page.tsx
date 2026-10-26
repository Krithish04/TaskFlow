import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { requireProjectAccess } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare } from "lucide-react";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${id}/chat`);
  }

  try {
    await requireProjectAccess(id, "view");
  } catch {
    notFound();
  }

  return (
    <div className="py-8">
      <EmptyState
        icon={MessageSquare}
        title="Project Chat"
        description="Dedicated project team communication channel with file attachments."
      />
    </div>
  );
}
