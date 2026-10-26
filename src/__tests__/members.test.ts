import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import {
  canAddProjectMembers,
  canEditProject,
  canViewProject,
  matchesId,
} from "../lib/permissions";

describe("Members Tab - Permissions & Access Matrix", () => {
  const adminUser = {
    id: "507f1f77bcf86cd799439011",
    role: "admin" as const,
    name: "Admin User",
    email: "admin@example.com",
  };

  const pmOwnerUser = {
    id: "507f1f77bcf86cd799439022",
    role: "pm" as const,
    name: "PM Owner",
    email: "pm@example.com",
  };

  const otherPmUser = {
    id: "507f1f77bcf86cd799439033",
    role: "pm" as const,
    name: "Other PM",
    email: "otherpm@example.com",
  };

  const regularMemberUser = {
    id: "507f1f77bcf86cd799439044",
    role: "user" as const,
    name: "Regular Member",
    email: "user@example.com",
  };

  const nonMemberUser = {
    id: "507f1f77bcf86cd799439055",
    role: "user" as const,
    name: "Non Member",
    email: "outsider@example.com",
  };

  const project = {
    _id: "607f1f77bcf86cd799439099",
    name: "TaskFlow Core",
    owner: pmOwnerUser.id,
    members: [regularMemberUser.id],
  };

  it("permits Admin to manage members for any project", () => {
    assert.equal(canAddProjectMembers(adminUser, project), true);
    assert.equal(canEditProject(adminUser, project), true);
  });

  it("permits PM Owner to manage members for own project", () => {
    assert.equal(canAddProjectMembers(pmOwnerUser, project), true);
    assert.equal(canEditProject(pmOwnerUser, project), true);
  });

  it("denies other PMs from managing members of projects they do not own", () => {
    assert.equal(canAddProjectMembers(otherPmUser, project), false);
    assert.equal(canEditProject(otherPmUser, project), false);
  });

  it("denies regular project members from managing members", () => {
    assert.equal(canAddProjectMembers(regularMemberUser, project), false);
    assert.equal(canEditProject(regularMemberUser, project), false);
  });

  it("denies non-members from even viewing the project", () => {
    assert.equal(canViewProject(nonMemberUser, project), false);
  });
});

describe("Members Tab - Member Removal & Task Unassignment Logic", () => {
  it("unassigns tasks when member is removed and preserves project isolation", () => {
    const projectAId = new Types.ObjectId().toString();
    const projectBId = new Types.ObjectId().toString();

    const memberToRemove = new Types.ObjectId().toString();
    const otherMember = new Types.ObjectId().toString();

    // Mock tasks across project A and project B
    let tasks = [
      {
        id: "t1",
        project: projectAId,
        assignee: memberToRemove,
        title: "Project A - Task 1",
      },
      {
        id: "t2",
        project: projectAId,
        assignee: otherMember,
        title: "Project A - Task 2",
      },
      {
        id: "t3",
        project: projectAId,
        assignee: null,
        title: "Project A - Task 3",
      },
      {
        id: "t4",
        project: projectBId,
        assignee: memberToRemove,
        title: "Project B - Task 1 (different project)",
      },
    ];

    // Simulate member removal in Project A
    const removeMemberFromProject = (projectId: string, userId: string) => {
      let unassignedCount = 0;
      tasks = tasks.map((t) => {
        if (t.project === projectId && matchesId(t.assignee, userId)) {
          unassignedCount++;
          return { ...t, assignee: null };
        }
        return t;
      });
      return unassignedCount;
    };

    const count = removeMemberFromProject(projectAId, memberToRemove);
    assert.equal(count, 1);

    // t1 in Project A should now be unassigned
    const t1 = tasks.find((t) => t.id === "t1");
    assert.equal(t1?.assignee, null);

    // t2 in Project A (assigned to otherMember) remains untouched
    const t2 = tasks.find((t) => t.id === "t2");
    assert.equal(t2?.assignee, otherMember);

    // t3 in Project A (unassigned) remains untouched
    const t3 = tasks.find((t) => t.id === "t3");
    assert.equal(t3?.assignee, null);

    // Isolation: t4 in Project B must NOT be unassigned
    const t4 = tasks.find((t) => t.id === "t4");
    assert.equal(t4?.assignee, memberToRemove);
  });

  it("protects project owner from being removed", () => {
    const ownerId = "507f1f77bcf86cd799439001";
    const members = ["507f1f77bcf86cd799439002", "507f1f77bcf86cd799439003"];

    const canRemoveUser = (userId: string) => {
      if (matchesId(ownerId, userId)) {
        return { allowed: false, error: "Cannot remove project owner" };
      }
      if (!members.includes(userId)) {
        return { allowed: false, error: "User is not a member" };
      }
      return { allowed: true };
    };

    assert.deepEqual(canRemoveUser(ownerId), {
      allowed: false,
      error: "Cannot remove project owner",
    });

    assert.deepEqual(canRemoveUser("507f1f77bcf86cd799439002"), {
      allowed: true,
    });
  });

  it("prevents adding duplicate members or the project owner", () => {
    const ownerId = "507f1f77bcf86cd799439001";
    const members = ["507f1f77bcf86cd799439002"];

    const canAddUser = (userId: string) => {
      if (matchesId(ownerId, userId)) {
        return { allowed: false, error: "User is already owner" };
      }
      if (members.includes(userId)) {
        return { allowed: false, error: "User is already member" };
      }
      return { allowed: true };
    };

    assert.equal(canAddUser(ownerId).allowed, false);
    assert.equal(canAddUser("507f1f77bcf86cd799439002").allowed, false);
    assert.equal(canAddUser("507f1f77bcf86cd799439003").allowed, true);
  });
});
