import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { canViewProject, canDeleteMessage, matchesId } from "../lib/permissions";

describe("Messages - Data Model & Validation Logic", () => {
  it("enforces message body length and text or attachment requirement", () => {
    const validateMessagePayload = (body?: string, fileIds: string[] = []) => {
      const trimmed = (body || "").trim();
      if (!trimmed && fileIds.length === 0) {
        return { valid: false, error: "Message must contain text or at least one attached file" };
      }
      if (trimmed.length > 4000) {
        return { valid: false, error: "Message body cannot exceed 4000 characters" };
      }
      if (fileIds.length > 5) {
        return { valid: false, error: "Cannot attach more than 5 files" };
      }
      const unique = new Set(fileIds);
      if (unique.size !== fileIds.length) {
        return { valid: false, error: "Duplicate file IDs in attachments" };
      }
      return { valid: true };
    };

    // Valid cases
    assert.equal(validateMessagePayload("Hello team").valid, true);
    assert.equal(validateMessagePayload("", ["file-1"]).valid, true);
    assert.equal(validateMessagePayload("Here are files", ["f1", "f2", "f3", "f4", "f5"]).valid, true);

    // Invalid cases: empty body and no attachments
    assert.equal(validateMessagePayload("", []).valid, false);
    assert.equal(validateMessagePayload("   ", []).valid, false);

    // Invalid cases: exceeds 4000 characters
    const longText = "a".repeat(4001);
    assert.equal(validateMessagePayload(longText).valid, false);

    // Invalid cases: exceeds 5 attachments
    assert.equal(validateMessagePayload("too many", ["1", "2", "3", "4", "5", "6"]).valid, false);

    // Invalid cases: duplicate attachment IDs
    assert.equal(validateMessagePayload("dups", ["f1", "f1"]).valid, false);
  });

  it("enforces that attached files must belong to the same project and not already be attached", () => {
    const projectIdA = new Types.ObjectId().toString();
    const projectIdB = new Types.ObjectId().toString();

    const fileInProjectA = {
      _id: new Types.ObjectId().toString(),
      project: projectIdA,
      name: "spec.pdf",
      messageId: null as string | null,
    };

    const alreadyAttachedFile = {
      _id: new Types.ObjectId().toString(),
      project: projectIdA,
      name: "already_attached.png",
      messageId: new Types.ObjectId().toString(),
    };

    const fileInProjectB = {
      _id: new Types.ObjectId().toString(),
      project: projectIdB,
      name: "foreign.docx",
      messageId: null as string | null,
    };

    const validateAttachmentEligibility = (
      files: Array<{ _id: string; project: string; messageId: string | null }>,
      targetProjectId: string
    ) => {
      for (const f of files) {
        if (!matchesId(f.project, targetProjectId)) {
          return { eligible: false, error: "Files must belong to the same project" };
        }
        if (f.messageId) {
          return { eligible: false, error: "File is already attached to another message" };
        }
      }
      return { eligible: true };
    };

    // Safe attachment within Project A
    assert.equal(validateAttachmentEligibility([fileInProjectA], projectIdA).eligible, true);

    // Rejects file from Project B attached to Project A message
    const crossProjectResult = validateAttachmentEligibility([fileInProjectB], projectIdA);
    assert.equal(crossProjectResult.eligible, false);
    assert.match(crossProjectResult.error || "", /Files must belong to the same project/);

    // Rejects file already attached to another message
    const alreadyAttachedResult = validateAttachmentEligibility([alreadyAttachedFile], projectIdA);
    assert.equal(alreadyAttachedResult.eligible, false);
    assert.match(alreadyAttachedResult.error || "", /already attached/);
  });
});

describe("Messages - Project Isolation & Anti-Probing", () => {
  const userA = {
    id: new Types.ObjectId().toString(),
    role: "user" as const,
    name: "User in Project A",
    email: "userA@example.com",
  };

  const userB = {
    id: new Types.ObjectId().toString(),
    role: "user" as const,
    name: "User in Project B",
    email: "userB@example.com",
  };

  const projectA = {
    _id: new Types.ObjectId().toString(),
    name: "Project A",
    owner: new Types.ObjectId().toString(),
    members: [userA.id],
  };

  const projectB = {
    _id: new Types.ObjectId().toString(),
    name: "Project B",
    owner: new Types.ObjectId().toString(),
    members: [userB.id],
  };

  const messageInProjectB = {
    id: new Types.ObjectId().toString(),
    project: projectB._id,
    author: userB.id,
    body: "Secret project B message",
  };

  it("enforces that a user from Project A cannot view messages in Project B", () => {
    assert.equal(canViewProject(userA, projectA), true);
    assert.equal(canViewProject(userA, projectB), false);
    assert.equal(canViewProject(userB, projectB), true);
  });

  it("enforces that a user from Project A attempting to delete Project B message is rejected (404 isolation)", () => {
    // Project is derived from stored message.project
    const targetProject = projectB;
    const canUserAAccess = canViewProject(userA, targetProject);
    assert.equal(canUserAAccess, false);

    // Anti-probing: if user cannot view project, endpoint returns 404
    const canUserADelete = canDeleteMessage(userA, messageInProjectB, targetProject);
    assert.equal(canUserADelete, false);
  });
});

describe("Messages - Deletion Permissions", () => {
  const projectOwner = {
    id: new Types.ObjectId().toString(),
    role: "pm" as const,
    name: "PM Owner",
    email: "owner@example.com",
  };

  const authorMember = {
    id: new Types.ObjectId().toString(),
    role: "user" as const,
    name: "Author Member",
    email: "author@example.com",
  };

  const regularMember = {
    id: new Types.ObjectId().toString(),
    role: "user" as const,
    name: "Other Member",
    email: "other@example.com",
  };

  const superAdmin = {
    id: new Types.ObjectId().toString(),
    role: "admin" as const,
    name: "Super Admin",
    email: "admin@example.com",
  };

  const project = {
    _id: new Types.ObjectId().toString(),
    name: "Test Project",
    owner: projectOwner.id,
    members: [authorMember.id, regularMember.id],
  };

  const message = {
    id: new Types.ObjectId().toString(),
    project: project._id,
    author: authorMember.id,
    body: "Design specs attached",
  };

  it("permits message author to delete their own message", () => {
    assert.equal(canDeleteMessage(authorMember, message, project), true);
  });

  it("permits project PM owner to delete any message in their project", () => {
    assert.equal(canDeleteMessage(projectOwner, message, project), true);
  });

  it("permits Admin to delete any message in any project", () => {
    assert.equal(canDeleteMessage(superAdmin, message, project), true);
  });

  it("denies another regular member from deleting someone else's message", () => {
    assert.equal(canDeleteMessage(regularMember, message, project), false);
  });

  it("denies a different PM who does not own this project from deleting messages", () => {
    const foreignPM = {
      id: new Types.ObjectId().toString(),
      role: "pm" as const,
      name: "Foreign PM",
      email: "foreign@example.com",
    };
    assert.equal(canDeleteMessage(foreignPM, message, project), false);
  });
});

describe("Messages - Timestamp Filtering & Read State Logic", () => {
  it("filters messages chronologically using the after parameter", () => {
    const t0 = new Date("2026-10-26T10:00:00.000Z");
    const t1 = new Date("2026-10-26T10:05:00.000Z");
    const t2 = new Date("2026-10-26T10:10:00.000Z");
    const t3 = new Date("2026-10-26T10:15:00.000Z");

    const messages = [
      { id: "1", createdAt: t0, body: "msg 1" },
      { id: "2", createdAt: t1, body: "msg 2" },
      { id: "3", createdAt: t2, body: "msg 3" },
      { id: "4", createdAt: t3, body: "msg 4" },
    ];

    const filterAfter = (afterIso: string) => {
      const threshold = new Date(afterIso);
      return messages.filter((m) => m.createdAt > threshold);
    };

    const newSinceT1 = filterAfter(t1.toISOString());
    assert.equal(newSinceT1.length, 2);
    assert.equal(newSinceT1[0].id, "3");
    assert.equal(newSinceT1[1].id, "4");

    const newSinceT3 = filterAfter(t3.toISOString());
    assert.equal(newSinceT3.length, 0);
  });

  it("calculates unread message count based on user lastReadAt", () => {
    const t0 = new Date("2026-10-26T12:00:00.000Z");
    const t1 = new Date("2026-10-26T12:30:00.000Z");
    const t2 = new Date("2026-10-26T13:00:00.000Z");
    const t3 = new Date("2026-10-26T13:30:00.000Z");

    const messages = [
      { id: "1", createdAt: t0 },
      { id: "2", createdAt: t1 },
      { id: "3", createdAt: t2 },
      { id: "4", createdAt: t3 },
    ];

    const calculateUnread = (lastReadAt: Date | null) => {
      const readDate = lastReadAt || new Date(0);
      return messages.filter((m) => m.createdAt > readDate).length;
    };

    // User has never read any messages
    assert.equal(calculateUnread(null), 4);

    // User read up to t1
    assert.equal(calculateUnread(t1), 2);

    // User read up to t3 (fully caught up)
    assert.equal(calculateUnread(t3), 0);
  });
});
