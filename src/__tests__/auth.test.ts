import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  credentialsSchema,
  authorizeCredentials,
  authConfig,
} from "@/auth";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

describe("Auth Credentials Schema", () => {
  it("accepts valid email and password", () => {
    const result = credentialsSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = credentialsSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = credentialsSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("authorizeCredentials", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when input credentials fail validation", async () => {
    const user = await authorizeCredentials({
      email: "invalid-email",
      password: "123",
    });
    expect(user).toBeNull();
  });

  it("returns null when user is not found in database", async () => {
    vi.spyOn(User, "findOne").mockResolvedValueOnce(null as never);

    const result = await authorizeCredentials({
      email: "notfound@example.com",
      password: "password123",
    });
    expect(result).toBeNull();
  });

  it("returns null when password does not match hash", async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: "Test User",
      email: "test@example.com",
      passwordHash: "$2a$10$fakehash",
      role: "user",
    };

    vi.spyOn(User, "findOne").mockResolvedValueOnce(mockUser as never);
    vi.spyOn(bcrypt, "compare").mockResolvedValueOnce(false as never);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "wrongpassword",
    });
    expect(result).toBeNull();
  });

  it("returns user object with id and role when credentials are correct", async () => {
    const mockId = new mongoose.Types.ObjectId();
    const mockUser = {
      _id: mockId,
      name: "Project Manager",
      email: "pm@example.com",
      passwordHash: "$2a$10$validhash",
      role: "pm",
    };

    vi.spyOn(User, "findOne").mockResolvedValueOnce(mockUser as never);
    vi.spyOn(bcrypt, "compare").mockResolvedValueOnce(true as never);

    const result = await authorizeCredentials({
      email: "PM@example.com",
      password: "correctpassword",
    });

    expect(result).toEqual({
      id: mockId.toString(),
      name: "Project Manager",
      email: "pm@example.com",
      role: "pm",
    });
  });
});

describe("Auth Callbacks", () => {
  it("jwt callback copies user id and role to token", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    if (jwtCallback) {
      const token = await jwtCallback({
        token: {},
        user: {
          id: "user-123",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      } as unknown as Parameters<typeof jwtCallback>[0]);

      expect(token).toEqual({
        id: "user-123",
        role: "admin",
      });
    }
  });

  it("session callback assigns token id and role to session.user", async () => {
    const sessionCallback = authConfig.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    if (sessionCallback) {
      const session = await sessionCallback({
        session: {
          user: {
            name: "Admin",
            email: "admin@example.com",
            emailVerified: null,
          },
          expires: new Date(Date.now() + 3600000).toISOString(),
        },
        token: {
          id: "user-456",
          role: "admin",
        },
      } as unknown as Parameters<typeof sessionCallback>[0]);

      expect(session?.user?.id).toBe("user-456");
      expect(session?.user?.role).toBe("admin");
    }
  });
});
