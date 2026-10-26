# TaskFlow Phase 2 rules (in addition to taskflow.md)

## Isolation
- Every message, file and analytics query is scoped to one project and checked with `requireProjectAccess()`.
- Derive the project from the stored record (message, file, task), never from a client-sent projectId.
- No access means 404, not 403.

## File upload security
- Files are stored in MongoDB GridFS and served only through an authenticated route that re-checks project access.
- Enforce limits on the server: 4 MB per file, 5 files per message, 100 MB per project.
- Allowlist extensions and check magic bytes. Never trust the client mime type. Block svg, html, js and executables.
- Sanitise filenames (strip paths and control characters). Never use a user-provided name as a storage path.
- Serve with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox`. Use `Content-Disposition: attachment` except for png, jpg, gif and webp.
- Rate limit uploads per user.

## Chat
- Plain text only. Render message bodies as text, never as HTML. Links may be auto-linked with `rel="noopener noreferrer"`.
- Poll with `after=<last message time>`, pause when the tab is hidden.

## UI
- Follow DESIGN.md. Use tokens, not hard-coded colors. Every screen needs loading, empty and error states and must work at 375 px and 1280 px.

## Data
- Migrations must be idempotent and safe to run twice.
- Aggregations for analytics run in MongoDB, not by loading every task into memory.
