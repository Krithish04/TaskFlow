import { describe, expect, it } from "vitest";
import { seedDatabase } from "../../scripts/seed";

describe("Seed Script Safety", () => {
  it("refuses to run when NODE_ENV is production", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    try {
      await expect(seedDatabase()).rejects.toThrow(
        "Refusing to run seed script in production environment"
      );
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    }
  });
});
