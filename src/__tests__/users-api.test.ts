import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { GET as getUsers, PATCH as patchUsers } from "@/app/api/users/route";
import { GET as getUserById, PATCH as patchUserById } from "@/app/api/users/[id]/route";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import * as authModule from "@/auth";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

describe("Users API - Permissions and Operations", () => {
  const adminSession = {
    user: {
      id: new mongoose.Types.ObjectId().toString(),
      name: "Admin User",
      email: "admin@example.com",
      role: "admin" as const,
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const pmSession = {
    user: {
      id: new mongoose.Types.ObjectId().toString(),
      name: "PM User",
      email: "pm@example.com",
      role: "pm" as const,
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const regularUserSession = {
    user: {
      id: new mongoose.Types.ObjectId().toString(),
      name: "Standard User",
      email: "user@example.com",
      role: "user" as const,
    },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // GET /api/users
  // =========================================================================
  describe("GET /api/users", () => {
    it("returns 401 Unauthorized when not logged in", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

      const response = await getUsers();
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toMatch(/Authentication required/i);
    });

    it("returns 200 with shared project users (name and id only) when user is PM", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmSession as never);

      const sharedUserId = new mongoose.Types.ObjectId();
      vi.spyOn(Project, "find").mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce([
          {
            _id: new mongoose.Types.ObjectId(),
            owner: new mongoose.Types.ObjectId(pmSession.user.id),
            members: [sharedUserId],
          },
        ]),
      } as never);

      vi.spyOn(User, "find").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce([
            {
              _id: sharedUserId,
              name: "Teammate",
            },
          ]),
        }),
      } as never);

      const response = await getUsers();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users).toEqual([
        { _id: sharedUserId.toString(), name: "Teammate" },
      ]);
      expect(data.users[0].email).toBeUndefined();
      expect(data.users[0].role).toBeUndefined();
    });

    it("returns 200 with shared project users when user is standard member", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);

      vi.spyOn(Project, "find").mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce([]),
      } as never);

      vi.spyOn(User, "find").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce([
            {
              _id: new mongoose.Types.ObjectId(regularUserSession.user.id),
              name: "Regular Member",
            },
          ]),
        }),
      } as never);

      const response = await getUsers();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users).toBeDefined();
    });

    it("returns 200 and user list without password hashes when admin", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          createdAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: "John PM",
          email: "john@example.com",
          role: "pm",
          createdAt: new Date(),
        },
      ];

      vi.spyOn(User, "find").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce(mockUsers),
        }),
      } as never);

      const response = await getUsers();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users).toHaveLength(2);
      expect(data.users[0].email).toBe("admin@example.com");
      expect(data.users[0].passwordHash).toBeUndefined();
    });
  });

  // =========================================================================
  // PATCH /api/users
  // =========================================================================
  describe("PATCH /api/users", () => {
    const validTargetId = new mongoose.Types.ObjectId().toString();

    it("returns 401 when not logged in", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/users", {
        method: "PATCH",
        body: JSON.stringify({ id: validTargetId, role: "pm" }),
      });

      const response = await patchUsers(req);
      expect(response.status).toBe(401);
    });

    it("returns 403 when called by non-admin", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(pmSession as never);

      const req = new NextRequest("http://localhost:3000/api/users", {
        method: "PATCH",
        body: JSON.stringify({ id: validTargetId, role: "user" }),
      });

      const response = await patchUsers(req);
      expect(response.status).toBe(403);
    });

    it("returns 400 when body has invalid role", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const req = new NextRequest("http://localhost:3000/api/users", {
        method: "PATCH",
        body: JSON.stringify({ id: validTargetId, role: "superuser" }),
      });

      const response = await patchUsers(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
    });

    it("returns 400 when body has invalid ObjectId", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const req = new NextRequest("http://localhost:3000/api/users", {
        method: "PATCH",
        body: JSON.stringify({ id: "invalid-id", role: "pm" }),
      });

      const response = await patchUsers(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid user ID");
    });

    it("returns 404 when target user is not found", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      vi.spyOn(User, "findById").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce(null),
        }),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/users", {
        method: "PATCH",
        body: JSON.stringify({ id: validTargetId, role: "pm" }),
      });

      const response = await patchUsers(req);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("User not found");
    });

    it("returns 409 when attempting to remove the last admin", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      vi.spyOn(User, "findById").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce({ _id: validTargetId, role: "admin" }),
        }),
      } as never);

      vi.spyOn(User, "countDocuments").mockResolvedValueOnce(1 as never);

      const req = new NextRequest("http://localhost:3000/api/users", {
        method: "PATCH",
        body: JSON.stringify({ id: validTargetId, role: "pm" }),
      });

      const response = await patchUsers(req);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe("Cannot remove the last administrator");
    });

    it("returns 200 and updated user when role change succeeds", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      vi.spyOn(User, "findById").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce({ _id: validTargetId, role: "user" }),
        }),
      } as never);

      const updatedDoc = {
        _id: validTargetId,
        name: "Target User",
        email: "target@example.com",
        role: "pm",
      };

      vi.spyOn(User, "findByIdAndUpdate").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce(updatedDoc),
        }),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/users", {
        method: "PATCH",
        body: JSON.stringify({ id: validTargetId, role: "pm" }),
      });

      const response = await patchUsers(req);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.role).toBe("pm");
      expect(data.user.passwordHash).toBeUndefined();
    });
  });

  // =========================================================================
  // PATCH & GET /api/users/[id]
  // =========================================================================
  describe("PATCH /api/users/[id]", () => {
    const validTargetId = new mongoose.Types.ObjectId().toString();

    it("returns 401 when not logged in", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

      const req = new NextRequest(`http://localhost:3000/api/users/${validTargetId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "pm" }),
      });

      const response = await patchUserById(req, {
        params: Promise.resolve({ id: validTargetId }),
      });
      expect(response.status).toBe(401);
    });

    it("returns 403 when non-admin calls route", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(regularUserSession as never);

      const req = new NextRequest(`http://localhost:3000/api/users/${validTargetId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      });

      const response = await patchUserById(req, {
        params: Promise.resolve({ id: validTargetId }),
      });
      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid ObjectId param", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const req = new NextRequest("http://localhost:3000/api/users/not-an-id", {
        method: "PATCH",
        body: JSON.stringify({ role: "pm" }),
      });

      const response = await patchUserById(req, {
        params: Promise.resolve({ id: "not-an-id" }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid user ID");
    });

    it("returns 400 for invalid role value in body", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const req = new NextRequest(`http://localhost:3000/api/users/${validTargetId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "moderator" }),
      });

      const response = await patchUserById(req, {
        params: Promise.resolve({ id: validTargetId }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
    });

    it("returns 404 when user is not found in database", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      vi.spyOn(User, "findById").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce(null),
        }),
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/users/${validTargetId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "pm" }),
      });

      const response = await patchUserById(req, {
        params: Promise.resolve({ id: validTargetId }),
      });
      expect(response.status).toBe(404);
    });

    it("returns 409 when attempting to remove the last admin via [id]", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      vi.spyOn(User, "findById").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce({ _id: validTargetId, role: "admin" }),
        }),
      } as never);

      vi.spyOn(User, "countDocuments").mockResolvedValueOnce(1 as never);

      const req = new NextRequest(`http://localhost:3000/api/users/${validTargetId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "user" }),
      });

      const response = await patchUserById(req, {
        params: Promise.resolve({ id: validTargetId }),
      });
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe("Cannot remove the last administrator");
    });

    it("returns 200 with updated user on success", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      const updated = {
        _id: validTargetId,
        name: "Jane User",
        email: "jane@example.com",
        role: "admin",
      };

      vi.spyOn(User, "findByIdAndUpdate").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce(updated),
        }),
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/users/${validTargetId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      });

      const response = await patchUserById(req, {
        params: Promise.resolve({ id: validTargetId }),
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.role).toBe("admin");
      expect(data.user.name).toBe("Jane User");
    });
  });

  describe("GET /api/users/[id]", () => {
    const validTargetId = new mongoose.Types.ObjectId().toString();

    it("returns 401 when unauthenticated", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(null as never);

      const req = new NextRequest(`http://localhost:3000/api/users/${validTargetId}`);
      const response = await getUserById(req, {
        params: Promise.resolve({ id: validTargetId }),
      });
      expect(response.status).toBe(401);
    });

    it("returns 200 with user data for admin", async () => {
      vi.spyOn(authModule, "auth").mockResolvedValueOnce(adminSession as never);

      vi.spyOn(User, "findById").mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce({
            _id: validTargetId,
            name: "Single User",
            email: "single@example.com",
            role: "user",
          }),
        }),
      } as never);

      const req = new NextRequest(`http://localhost:3000/api/users/${validTargetId}`);
      const response = await getUserById(req, {
        params: Promise.resolve({ id: validTargetId }),
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.name).toBe("Single User");
    });
  });
});
