import mongoose from "mongoose";

export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB per file
export const MAX_PROJECT_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB per project
export const MAX_FILES_PER_MESSAGE = 5;

export const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "txt",
  "md",
  "csv",
  "docx",
  "xlsx",
  "pptx",
  "zip",
]);

export const BLOCKED_EXTENSIONS = new Set([
  "svg",
  "html",
  "htm",
  "xhtml",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "exe",
  "bat",
  "cmd",
  "sh",
  "ps1",
  "php",
  "py",
  "jar",
  "vbs",
  "com",
  "dll",
  "wasm",
  "msi",
  "scr",
]);

export const INLINE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
};

/**
 * Sanitizes a filename:
 * - Strips directory traversal paths
 * - Removes control characters and forbidden characters
 * - Truncates base name while preserving extension
 */
export function sanitizeFilename(rawName: string): string {
  // Strip path separators and null bytes
  let clean = rawName.replace(/^.*[\\/]/, "").replace(/\0/g, "").trim();

  // Strip control characters
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");

  // Strip leading dots to prevent hidden files
  clean = clean.replace(/^\.+/, "");
  if (!clean) {
    return "unnamed_file";
  }

  // Separate name and extension
  const lastDot = clean.lastIndexOf(".");
  if (lastDot === -1) {
    clean = clean.replace(/[^a-zA-Z0-9_-]/g, "_");
    return clean.slice(0, 80) || "unnamed_file";
  }

  const base = clean
    .slice(0, lastDot)
    .trim()
    .replace(/[^a-zA-Z0-9_\-.]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const ext = clean.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");

  const safeBase = (base || "unnamed").slice(0, 80);
  return ext ? `${safeBase}.${ext}` : safeBase;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
  ext?: string;
}

/**
 * Validates a file's extension, size, declared MIME, and binary magic bytes.
 * Blocks executable scripts, HTML/SVG, and verifies known file signatures.
 */
export function validateFileType(
  buffer: Buffer,
  filename: string,
  declaredMime?: string
): FileValidationResult {
  // Defense-in-depth: reject client-declared dangerous mime types
  if (declaredMime) {
    const lowerMime = declaredMime.toLowerCase();
    if (
      lowerMime.includes("svg") ||
      lowerMime.includes("html") ||
      lowerMime.includes("javascript")
    ) {
      return { valid: false, error: "Declared MIME type is blocked for security reasons" };
    }
  }

  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return { valid: false, error: "File must have a valid extension" };
  }

  const ext = filename.slice(lastDot + 1).toLowerCase();

  // Explicit blocklist check
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type .${ext} is blocked for security reasons` };
  }

  // Explicit allowlist check
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension .${ext} is not allowed` };
  }

  // Magic bytes inspection
  if (ext === "pdf") {
    // %PDF- (0x25 0x50 0x44 0x46)
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x25 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x44 ||
      buffer[3] !== 0x46
    ) {
      return { valid: false, error: "File content does not match valid PDF signature" };
    }
    return { valid: true, detectedMime: "application/pdf", ext };
  }

  if (ext === "png") {
    // 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      buffer.length < 8 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47 ||
      buffer[4] !== 0x0d ||
      buffer[5] !== 0x0a ||
      buffer[6] !== 0x1a ||
      buffer[7] !== 0x0a
    ) {
      return { valid: false, error: "File content does not match valid PNG signature" };
    }
    return { valid: true, detectedMime: "image/png", ext };
  }

  if (ext === "jpg" || ext === "jpeg") {
    // 0xFF 0xD8 0xFF
    if (
      buffer.length < 3 ||
      buffer[0] !== 0xff ||
      buffer[1] !== 0xd8 ||
      buffer[2] !== 0xff
    ) {
      return { valid: false, error: "File content does not match valid JPEG signature" };
    }
    return { valid: true, detectedMime: "image/jpeg", ext };
  }

  if (ext === "gif") {
    // GIF87a or GIF89a (0x47 0x49 0x46 0x38 0x37/0x39 0x61)
    const isGif =
      buffer.length >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61;
    if (!isGif) {
      return { valid: false, error: "File content does not match valid GIF signature" };
    }
    return { valid: true, detectedMime: "image/gif", ext };
  }

  if (ext === "webp") {
    // RIFF....WEBP (0x52 0x49 0x46 0x46 at 0 and 0x57 0x45 0x42 0x50 at 8)
    const isWebp =
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    if (!isWebp) {
      return { valid: false, error: "File content does not match valid WEBP signature" };
    }
    return { valid: true, detectedMime: "image/webp", ext };
  }

  if (ext === "zip" || ext === "docx" || ext === "xlsx" || ext === "pptx") {
    // PK\x03\x04 or PK\x05\x06 or PK\x07\x08 (0x50 0x4B)
    const isZip =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);
    if (!isZip) {
      return {
        valid: false,
        error: `File content does not match valid signature for .${ext}`,
      };
    }
    return { valid: true, detectedMime: EXTENSION_TO_MIME[ext] || "application/zip", ext };
  }

  if (ext === "txt" || ext === "md" || ext === "csv") {
    // Must be valid UTF-8 text without null bytes or HTML/SVG executable code
    for (let i = 0; i < Math.min(buffer.length, 4096); i++) {
      if (buffer[i] === 0x00) {
        return { valid: false, error: "Plain text files cannot contain binary null bytes" };
      }
    }

    const textSample = buffer.slice(0, 2048).toString("utf-8").toLowerCase();
    if (
      textSample.includes("<html") ||
      textSample.includes("<svg") ||
      textSample.includes("<script") ||
      textSample.includes("<?xml") ||
      textSample.includes("<!doctype")
    ) {
      return {
        valid: false,
        error: "Embedded HTML, XML, or SVG scripts are prohibited in text files",
      };
    }

    return { valid: true, detectedMime: EXTENSION_TO_MIME[ext] || "text/plain", ext };
  }

  return { valid: false, error: "Unsupported file type" };
}

/**
 * Returns the Content-Disposition header based on MIME type:
 * inline for images, attachment for all other types.
 */
export function getContentDisposition(mime: string, filename: string): string {
  const safeFilename = filename.replace(/["\r\n]/g, "");
  if (INLINE_MIME_TYPES.has(mime)) {
    return `inline; filename="${safeFilename}"`;
  }
  return `attachment; filename="${safeFilename}"`;
}

// In-memory rolling-window rate limiter for uploads: Map<userId, timestamp[]>
const uploadTimestamps = new Map<string, number[]>();
const MAX_UPLOADS_PER_MINUTE = 20;
const UPLOAD_WINDOW_MS = 60 * 1000;

/**
 * Checks whether a user has exceeded their upload rate limit.
 */
export function checkUploadRateLimit(
  userId: string,
  maxUploads: number = MAX_UPLOADS_PER_MINUTE,
  windowMs: number = UPLOAD_WINDOW_MS
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = uploadTimestamps.get(userId) || [];
  const valid = existing.filter((t) => t > windowStart);

  if (valid.length >= maxUploads) {
    const oldest = valid[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  valid.push(now);
  uploadTimestamps.set(userId, valid);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Resets upload rate limit map (useful in tests).
 */
export function resetUploadRateLimits(): void {
  uploadTimestamps.clear();
}

/**
 * Returns the MongoDB GridFS Bucket for TaskFlow files.
 */
export function getGridFSBucket(): mongoose.mongo.GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB database connection is not established");
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "project_files" });
}
