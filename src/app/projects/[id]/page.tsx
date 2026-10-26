import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { requireProjectAccess } from "@/lib/permissions";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export default async function ProjectBarePage({ params }: ProjectPageProps) {
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${id}/overview`);
  }

  try {
    await requireProjectAccess(id, "view");
  } catch {
    notFound();
  }

  redirect(`/projects/${id}/overview`);
}
