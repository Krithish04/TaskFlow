import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import {
  sanitizeFilename,
  validateFileType,
  getContentDisposition,
  checkUploadRateLimit,
  resetUploadRateLimits,
  MAX_FILE_SIZE,
  MAX_PROJECT_STORAGE_BYTES,
} from "../lib/file-utils";
import { canViewProject, matchesId } from "../lib/permissions";

describe("File Storage - Filename Sanitization", () => {
  it("strips directory traversal paths and null bytes", () => {
    assert.equal(sanitizeFilename("../../../etc/passwd.txt"), "passwd.txt");
    assert.equal(sanitizeFilename("..\\..\\windows\\system32\\cmd.exe"), "cmd.exe");
    assert.equal(sanitizeFilename("foo\0bar.pdf"), "foobar.pdf");
  });

  it("sanitizes forbidden characters and preserves safe extensions", () => {
    assert.equal(sanitizeFilename("Project Report (Draft) [v2]!.pdf"), "Project_Report_Draft_v2.pdf");
    assert.equal(sanitizeFilename("clean-file_name.123.png"), "clean-file_name.123.png");
    assert.equal(sanitizeFilename("   spaced name  .docx"), "spaced_name.docx");
  });

  it("handles filenames without extensions or leading dots safely", () => {
    assert.equal(sanitizeFilename(".env"), "env");
    assert.equal(sanitizeFilename("...."), "unnamed_file");
    assert.equal(sanitizeFilename("no_ext"), "no_ext");
  });
});

describe("File Storage - Magic Bytes & Extension Validation", () => {
  it("validates valid PDF magic bytes", () => {
    const validPdfBuffer = Buffer.from("%PDF-1.7 valid pdf content");
    const result = validateFileType(validPdfBuffer, "report.pdf", "application/pdf");
    assert.equal(result.valid, true);
    assert.equal(result.detectedMime, "application/pdf");

    const fakePdfBuffer = Buffer.from("NOT_A_PDF content");
    const fakeResult = validateFileType(fakePdfBuffer, "fake.pdf", "application/pdf");
    assert.equal(fakeResult.valid, false);
    assert.match(fakeResult.error || "", /PDF signature/);
  });

  it("validates valid PNG magic bytes", () => {
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    const result = validateFileType(validPngBuffer, "image.png", "image/png");
    assert.equal(result.valid, true);
    assert.equal(result.detectedMime, "image/png");

    const badPng = Buffer.from([0x89, 0x00, 0x00, 0x00]);
    assert.equal(validateFileType(badPng, "bad.png").valid, false);
  });

  it("validates valid JPEG magic bytes", () => {
    const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = validateFileType(validJpgBuffer, "photo.jpg", "image/jpeg");
    assert.equal(result.valid, true);
    assert.equal(result.detectedMime, "image/jpeg");
  });

  it("validates valid GIF magic bytes", () => {
    const validGifBuffer = Buffer.from("GIF89a" + "\x00\x00\x00");
    const result = validateFileType(validGifBuffer, "anim.gif", "image/gif");
    assert.equal(result.valid, true);
    assert.equal(result.detectedMime, "image/gif");
  });

  it("validates valid WEBP magic bytes", () => {
    const validWebpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, // WEBP (0x57, 0x45, 0x42, 0x50)
    ]);
    const result = validateFileType(validWebpBuffer, "graphic.webp", "image/webp");
    assert.equal(result.valid, true);
    assert.equal(result.detectedMime, "image/webp");
  });

  it("validates valid ZIP / DOCX / XLSX magic bytes", () => {
    const validZipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const zipResult = validateFileType(validZipBuffer, "archive.zip");
    assert.equal(zipResult.valid, true);

    const docxResult = validateFileType(validZipBuffer, "document.docx");
    assert.equal(docxResult.valid, true);
    assert.equal(
      docxResult.detectedMime,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("validates plain text, Markdown, and CSV files while rejecting HTML/SVG scripts", () => {
    const plainText = Buffer.from("TaskFlow project notes\nLine 2");
    assert.equal(validateFileType(plainText, "notes.txt").valid, true);
    assert.equal(validateFileType(plainText, "readme.md").valid, true);
    assert.equal(validateFileType(plainText, "data.csv").valid, true);

    // Reject text files with binary null bytes
    const textWithNull = Buffer.from("Binary\x00Injected");
    assert.equal(validateFileType(textWithNull, "bad.txt").valid, false);

    // Reject text files containing embedded HTML/SVG executable tags
    const htmlInjected = Buffer.from("<html><script>alert(1)</script></html>");
    const htmlResult = validateFileType(htmlInjected, "innocent.txt");
    assert.equal(htmlResult.valid, false);
    assert.match(htmlResult.error || "", /embedded html, xml, or svg/i);

    const svgInjected = Buffer.from("<svg onload='alert(1)'></svg>");
    assert.equal(validateFileType(svgInjected, "sample.md").valid, false);
  });

  it("blocks dangerous and executable file extensions", () => {
    const dummyBuffer = Buffer.from("console.log('pwned');");
    assert.equal(validateFileType(dummyBuffer, "malicious.svg").valid, false);
    assert.equal(validateFileType(dummyBuffer, "script.js").valid, false);
    assert.equal(validateFileType(dummyBuffer, "index.html").valid, false);
    assert.equal(validateFileType(dummyBuffer, "payload.exe").valid, false);
    assert.equal(validateFileType(dummyBuffer, "backdoor.php").valid, false);
    assert.equal(validateFileType(dummyBuffer, "run.sh").valid, false);
  });
});

describe("File Storage - Content-Disposition & Security Headers", () => {
  it("sets inline disposition for images and attachment for all other documents", () => {
    assert.equal(
      getContentDisposition("image/png", "chart.png"),
      'inline; filename="chart.png"'
    );
    assert.equal(
      getContentDisposition("image/jpeg", "avatar.jpg"),
      'inline; filename="avatar.jpg"'
    );
    assert.equal(
      getContentDisposition("image/webp", "banner.webp"),
      'inline; filename="banner.webp"'
    );

    assert.equal(
      getContentDisposition("application/pdf", "contract.pdf"),
      'attachment; filename="contract.pdf"'
    );
    assert.equal(
      getContentDisposition("text/plain", "data.txt"),
      'attachment; filename="data.txt"'
    );
    assert.equal(
      getContentDisposition("application/zip", "bundle.zip"),
      'attachment; filename="bundle.zip"'
    );
  });
});

describe("File Storage - Rate Limiting & Storage Quotas", () => {
  beforeEach(() => {
    resetUploadRateLimits();
  });

  it("enforces rolling-window rate limits per user", () => {
    const userId = "user-123";
    for (let i = 0; i < 5; i++) {
      const res = checkUploadRateLimit(userId, 5, 60000);
      assert.equal(res.allowed, true);
    }

    const rateLimitedRes = checkUploadRateLimit(userId, 5, 60000);
    assert.equal(rateLimitedRes.allowed, false);
    assert.ok(rateLimitedRes.retryAfterSeconds > 0);

    // Other user should not be affected
    const otherUserRes = checkUploadRateLimit("other-user-456", 5, 60000);
    assert.equal(otherUserRes.allowed, true);
  });

  it("validates size and project quota limits", () => {
    assert.equal(MAX_FILE_SIZE, 4 * 1024 * 1024);
    assert.equal(MAX_PROJECT_STORAGE_BYTES, 100 * 1024 * 1024);

    const isWithinQuota = (currentUsage: number, newFileBytes: number) => {
      return currentUsage + newFileBytes <= MAX_PROJECT_STORAGE_BYTES;
    };

    assert.equal(isWithinQuota(50 * 1024 * 1024, 2 * 1024 * 1024), true);
    assert.equal(isWithinQuota(99 * 1024 * 1024, 2 * 1024 * 1024), false);
  });
});

describe("File Storage - Project Isolation & Access Control", () => {
  const userA = {
    id: new Types.ObjectId().toString(),
    role: "user" as const,
    name: "User A (Project A Member)",
    email: "userA@example.com",
  };

  const userB = {
    id: new Types.ObjectId().toString(),
    role: "user" as const,
    name: "User B (Project B Member)",
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

  const fileInProjectB = {
    id: new Types.ObjectId().toString(),
    project: projectB._id,
    uploader: userB.id,
    name: "financials.pdf",
    size: 1024,
  };

  it("enforces that a user from Project A requesting a file of Project B is rejected (404 isolation)", () => {
    // User A has access to Project A
    assert.equal(canViewProject(userA, projectA), true);

    // User A attempts to view file in Project B
    // Project is derived from the file's project reference (projectB)
    const canUserAAccess = canViewProject(userA, projectB);
    assert.equal(canUserAAccess, false);

    // User B should be permitted
    const canUserBAccess = canViewProject(userB, projectB);
    assert.equal(canUserBAccess, true);
  });

  it("enforces delete permissions (uploader, PM owner, Admin)", () => {
    const adminUser = {
      id: new Types.ObjectId().toString(),
      role: "admin" as const,
      name: "Admin",
    };

    const pmOwner = {
      id: projectB.owner,
      role: "pm" as const,
      name: "PM Owner",
    };

    const regularNonUploader = {
      id: new Types.ObjectId().toString(),
      role: "user" as const,
      name: "Another Member in Project B",
    };

    const canDeleteFile = (user: { id: string; role: string }, file: typeof fileInProjectB, project: typeof projectB) => {
      if (user.role === "admin") return true;
      if (matchesId(file.uploader, user.id)) return true;
      if (matchesId(project.owner, user.id)) return true;
      return false;
    };

    // Uploader can delete
    assert.equal(canDeleteFile(userB, fileInProjectB, projectB), true);
    // Project PM owner can delete
    assert.equal(canDeleteFile(pmOwner, fileInProjectB, projectB), true);
    // Admin can delete
    assert.equal(canDeleteFile(adminUser, fileInProjectB, projectB), true);
    // Other member cannot delete
    assert.equal(canDeleteFile(regularNonUploader, fileInProjectB, projectB), false);
  });
});
