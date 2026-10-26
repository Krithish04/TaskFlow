import { notFound, redirect } from "next/navigation";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { requireProjectAccess, matchesId } from "@/lib/permissions";
import { MembersManager, type MemberItem, type AvailableUserItem } from "./members-manager";

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

  const project = await Project.findById(id)
    .populate("owner", "name email role")
    .populate("members", "name email role")
    .lean();

  if (!project) {
    notFound();
  }

  const isSuperAdmin = session.user.role === "admin";
  const isProjectOwner = matchesId(project.owner, session.user.id);

  // PRD: Members tab is PM and Admin only. Return 404 for unauthorized users
  if (!isSuperAdmin && !isProjectOwner) {
    notFound();
  }

  // Get task counts per assignee in this project
  const taskCounts = await Task.aggregate([
    {
      $match: {
        project: new Types.ObjectId(id),
        assignee: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$assignee",
        count: { $sum: 1 },
      },
    },
  ]);

  const taskCountMap = new Map<string, number>(
    taskCounts.map((tc) => [tc._id.toString(), tc.count])
  );

  const ownerObj = project.owner as unknown as {
    _id: Types.ObjectId;
    name: string;
    email: string;
    role: string;
  };

  const membersArr = Array.isArray(project.members)
    ? (project.members as unknown as Array<{
        _id: Types.ObjectId;
        name: string;
        email: string;
        role: string;
      }>)
    : [];

  const existingMemberIds = [
    ownerObj._id.toString(),
    ...membersArr.map((m) => m._id.toString()),
  ];

  // Eligible users to add: users not already owner or member
  const availableUsersDoc = isSuperAdmin
    ? await User.find(
        { _id: { $nin: existingMemberIds.map((mid) => new Types.ObjectId(mid)) } },
        "name email role"
      )
        .sort({ name: 1 })
        .lean()
    : await User.find(
        {
          _id: { $nin: existingMemberIds.map((mid) => new Types.ObjectId(mid)) },
          role: { $in: ["pm", "user"] },
        },
        "name email role"
      )
        .sort({ name: 1 })
        .lean();

  const initialOwner: MemberItem = {
    id: ownerObj._id.toString(),
    name: ownerObj.name,
    email: ownerObj.email,
    role: ownerObj.role,
    assignedTasksCount: taskCountMap.get(ownerObj._id.toString()) || 0,
    isOwner: true,
  };

  const initialMembers: MemberItem[] = membersArr
    .filter((m) => m._id.toString() !== ownerObj._id.toString())
    .map((m) => ({
      id: m._id.toString(),
      name: m.name,
      email: m.email,
      role: m.role,
      assignedTasksCount: taskCountMap.get(m._id.toString()) || 0,
      isOwner: false,
    }));

  const initialAvailableUsers: AvailableUserItem[] = availableUsersDoc.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
  }));

  return (
    <MembersManager
      projectId={id}
      initialOwner={initialOwner}
      initialMembers={initialMembers}
      initialAvailableUsers={initialAvailableUsers}
      canManage={isSuperAdmin || isProjectOwner}
    />
  );
}
