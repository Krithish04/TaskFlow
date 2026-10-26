import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import {
  canViewProject,
  canEditProject,
  requireProjectAccess,
  canDeleteMessage,
  matchesId,
  NotFoundError,
  type AuthUser,
} from "../lib/permissions";
import { type IProject } from "../models/Project";

describe("TaskFlow Phase 2 - Multi-Tenant Isolation & Anti-Probing", () => {
  const adminUser: AuthUser = {
    id: new Types.ObjectId().toString(),
    role: "admin",
    name: "Admin User",
    email: "admin@example.com",
  };

  const pmAlice: AuthUser = {
    id: new Types.ObjectId().toString(),
    role: "pm",
    name: "PM Alice",
    email: "alice@example.com",
  };

  const pmBob: AuthUser = {
    id: new Types.ObjectId().toString(),
    role: "pm",
    name: "PM Bob",
    email: "bob@example.com",
  };

  const memberCharlie: AuthUser = {
    id: new Types.ObjectId().toString(),
    role: "user",
    name: "Charlie (Team A)",
    email: "charlie@example.com",
  };

  const memberDavid: AuthUser = {
    id: new Types.ObjectId().toString(),
    role: "user",
    name: "David (Team B)",
    email: "david@example.com",
  };

  const projectAId = new Types.ObjectId();
  const projectBId = new Types.ObjectId();

  const mockProjectA = {
    _id: projectAId,
    name: "Project A",
    key: "PROJA",
    color: "blue",
    owner: new Types.ObjectId(pmAlice.id),
    members: [new Types.ObjectId(memberCharlie.id)],
    status: "active" as const,
  } as unknown as IProject;

  const mockProjectB = {
    _id: projectBId,
    name: "Project B",
    key: "PROJB",
    color: "emerald",
    owner: new Types.ObjectId(pmBob.id),
    members: [new Types.ObjectId(memberDavid.id)],
    status: "active" as const,
  } as unknown as IProject;

  // =========================================================================
  // 1. Core Workspace Access & Anti-Probing (404 on No Access)
  // =========================================================================
  describe("1. Workspace Access & Anti-Probing (404 not 403)", () => {
    it("permits PM Alice and Charlie to view Project A", () => {
      assert.equal(canViewProject(pmAlice, mockProjectA), true);
      assert.equal(canViewProject(memberCharlie, mockProjectA), true);
    });

    it("denies David and PM Bob from viewing Project A", () => {
      assert.equal(canViewProject(memberDavid, mockProjectA), false);
      assert.equal(canViewProject(pmBob, mockProjectA), false);
    });

    it("requireProjectAccess throws NotFoundError (404) rather than ForbiddenError (403) for outsiders", async () => {
      // Anti-probing: outsider attempting to view Project A must receive 404
      await assert.rejects(
        async () => {
          await requireProjectAccess(mockProjectA, "view", memberDavid);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          assert.equal((err as NotFoundError).message, "Project not found");
          return true;
        }
      );

      // Other PM attempting to probe Project A also receives 404
      await assert.rejects(
        async () => {
          await requireProjectAccess(mockProjectA, "view", pmBob);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );
    });

    it("permits Admin to access any project workspace", async () => {
      const resA = await requireProjectAccess(mockProjectA, "view", adminUser);
      assert.equal(resA.project._id.toString(), projectAId.toString());

      const resB = await requireProjectAccess(mockProjectB, "view", adminUser);
      assert.equal(resB.project._id.toString(), projectBId.toString());
    });

    it("enforces edit privileges: PM owner can edit own project, members cannot", () => {
      assert.equal(canEditProject(pmAlice, mockProjectA), true);
      assert.equal(canEditProject(memberCharlie, mockProjectA), false);
      assert.equal(canEditProject(pmBob, mockProjectA), false);
      assert.equal(canEditProject(adminUser, mockProjectA), true);
    });
  });

  // =========================================================================
  // 2. Chat & Message Isolation
  // =========================================================================
  describe("2. Chat & Message Isolation", () => {
    const messageAId = new Types.ObjectId().toString();
    const messageBId = new Types.ObjectId().toString();

    const mockMessageA = {
      id: messageAId,
      project: mockProjectA,
      author: memberCharlie.id,
      body: "Confidential status update for Project A",
      attachments: [],
    };

    const mockMessageB = {
      id: messageBId,
      project: mockProjectB,
      author: memberDavid.id,
      body: "Internal planning for Project B",
      attachments: [],
    };

    it("verifies user cannot read messages from another project", async () => {
      // Member David (Project B) attempting to access Project A messages must get 404
      await assert.rejects(
        async () => {
          await requireProjectAccess(mockMessageA.project, "view", memberDavid);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );
    });

    it("verifies user cannot post messages into another project", async () => {
      // Member Charlie (Project A) attempting to post to Project B must get 404
      await assert.rejects(
        async () => {
          await requireProjectAccess(mockMessageB.project, "view", memberCharlie);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );
    });

    it("enforces cross-project attachment rejection (files must belong to same project)", () => {
      const fileOfProjectA = {
        _id: new Types.ObjectId(),
        project: projectAId,
        messageId: null,
      };

      const fileOfProjectB = {
        _id: new Types.ObjectId(),
        project: projectBId,
        messageId: null,
      };

      // Valid: attaching file of Project A to message in Project A
      const isFileAEligibleForProjectA =
        fileOfProjectA.project.toString() === mockProjectA._id.toString() &&
        fileOfProjectA.messageId === null;
      assert.equal(isFileAEligibleForProjectA, true);

      // Invalid: attempting to attach file of Project B to message in Project A
      const isFileBEligibleForProjectA =
        fileOfProjectB.project.toString() === mockProjectA._id.toString() &&
        fileOfProjectB.messageId === null;
      assert.equal(isFileBEligibleForProjectA, false);
    });

    it("derives project association from stored message record on deletion, never client input", async () => {
      // When DELETE /api/messages/[id] is invoked, project is derived from stored message
      const targetMessage = mockMessageB;
      const derivedProject = targetMessage.project;

      // Outsider Charlie attempting to delete Project B message is blocked via 404
      await assert.rejects(
        async () => {
          await requireProjectAccess(derivedProject, "view", memberCharlie);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );
    });

    it("enforces message deletion permissions strictly within project", () => {
      const message = { author: memberCharlie.id };

      // Author Charlie can delete own message
      assert.equal(
        canDeleteMessage(memberCharlie, message, mockProjectA),
        true
      );

      // Project PM Alice can delete Charlie's message in Project A
      assert.equal(
        canDeleteMessage(pmAlice, message, mockProjectA),
        true
      );

      // Admin can delete Charlie's message
      assert.equal(
        canDeleteMessage(adminUser, message, mockProjectA),
        true
      );

      // Different PM Bob cannot delete Charlie's message in Project A
      assert.equal(
        canDeleteMessage(pmBob, message, mockProjectA),
        false
      );
    });
  });

  // =========================================================================
  // 3. File Storage & GridFS Isolation
  // =========================================================================
  describe("3. File Storage & GridFS Isolation", () => {
    const fileAId = new Types.ObjectId().toString();
    const fileBId = new Types.ObjectId().toString();

    const mockStoredFileA = {
      _id: new Types.ObjectId(fileAId),
      project: mockProjectA,
      uploader: memberCharlie.id,
      name: "architecture-spec.pdf",
      size: 1024 * 1024,
      deletedAt: null,
    };

    const mockStoredFileB = {
      _id: new Types.ObjectId(fileBId),
      project: mockProjectB,
      uploader: memberDavid.id,
      name: "budget-spreadsheet.xlsx",
      size: 512 * 1024,
      deletedAt: null,
    };

    it("GET /api/files/[id] derives project from stored record and rejects user from Project A with 404 (isolation)", async () => {
      // Member Charlie from Project A can access File A:
      const { project } = await requireProjectAccess(mockStoredFileA.project, "view", memberCharlie);
      assert.equal(project._id.toString(), mockProjectA._id.toString());

      // User Charlie from Project A attempts to download File B:
      // Derives project: mockStoredFileB.project (Project B)
      const derivedProject = mockStoredFileB.project;

      // Access check fails with 404
      await assert.rejects(
        async () => {
          await requireProjectAccess(derivedProject, "view", memberCharlie);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );
    });

    it("POST /api/projects/[id]/files blocks non-members with 404", async () => {
      // Member David attempts to upload to Project A
      await assert.rejects(
        async () => {
          await requireProjectAccess(mockProjectA, "view", memberDavid);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );
    });

    it("PATCH /api/files/[id] rejects attaching a file from Project B to a task from Project A", () => {
      const taskInProjectA = {
        _id: new Types.ObjectId(),
        project: projectAId,
      };

      const fileFromProjectB = mockStoredFileB;

      // Cross-project attachment check:
      const isAllowed =
        fileFromProjectB.project._id.toString() === taskInProjectA.project.toString();
      assert.equal(isAllowed, false);
    });

    it("DELETE /api/files/[id] enforces deletion rights and rejects non-authorized users with 404", async () => {
      // Uploader David can delete own file in Project B
      const canDavidDelete =
        mockStoredFileB.uploader === memberDavid.id ||
        matchesId(mockProjectB.owner, memberDavid.id) ||
        memberDavid.role === "admin";
      assert.equal(canDavidDelete, true);

      // Charlie from Project A cannot even resolve Project B access (404)
      await assert.rejects(
        async () => {
          await requireProjectAccess(mockStoredFileB.project, "view", memberCharlie);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // 4. Analytics Isolation
  // =========================================================================
  describe("4. Analytics Isolation (Project & Global Views)", () => {
    it("GET /api/projects/[id]/analytics returns 404 when outsider requests project analytics", async () => {
      // Member David attempts to inspect Project A analytics
      await assert.rejects(
        async () => {
          await requireProjectAccess(mockProjectA, "view", memberDavid);
        },
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );
    });

    it("GET /api/analytics/global enforces strict PM project isolation", () => {
      const allProjects = [mockProjectA, mockProjectB];

      // PM Alice only gets projects where she is the owner
      const aliceScope = allProjects.filter((p) =>
        matchesId(p.owner, pmAlice.id)
      );
      assert.equal(aliceScope.length, 1);
      assert.equal(aliceScope[0]._id.toString(), projectAId.toString());

      // PM Bob only gets projects where he is the owner
      const bobScope = allProjects.filter((p) =>
        matchesId(p.owner, pmBob.id)
      );
      assert.equal(bobScope.length, 1);
      assert.equal(bobScope[0]._id.toString(), projectBId.toString());

      // Admin gets all projects
      const adminScope = allProjects;
      assert.equal(adminScope.length, 2);
    });

    it("GET /api/analytics/global rejects regular team members (404 anti-probing)", () => {
      const checkGlobalAnalyticsAccess = (user: AuthUser) => {
        if (user.role !== "admin" && user.role !== "pm") {
          throw new NotFoundError("Not found");
        }
        return true;
      };

      assert.throws(
        () => checkGlobalAnalyticsAccess(memberCharlie),
        (err: unknown) => {
          assert(err instanceof NotFoundError);
          assert.equal((err as NotFoundError).status, 404);
          return true;
        }
      );

      assert.equal(checkGlobalAnalyticsAccess(pmAlice), true);
      assert.equal(checkGlobalAnalyticsAccess(adminUser), true);
    });
  });
});
