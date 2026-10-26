import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { requireProjectAccess } from "@/lib/permissions";
import { ChatView } from "@/components/chat/chat-view";

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

  let projectOwnerId = "";
  try {
    const { project } = await requireProjectAccess(id, "view");
    projectOwnerId = project.owner?.toString() || "";
  } catch {
    notFound();
  }

  return (
    <div className="py-1">
      <ChatView
        projectId={id}
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
