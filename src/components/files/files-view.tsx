"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  Download,
  Trash2,
  Upload,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  X,
  HardDrive,
  File as FileGenericIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/overview-utils";

export interface ProjectFile {
  _id: string;
  name: string;
  mime: string;
  size: number;
  storageId: string;
  uploader: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
  };
  taskId?: {
    _id: string;
    number: number;
    title: string;
  } | null;
  messageId?: string | null;
  createdAt: string;
}

interface FilesViewProps {
  projectId: string;
  projectKey?: string;
  projectOwnerId: string;
  currentUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

const MAX_PROJECT_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_SINGLE_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileCategory(name: string, mime: string): "image" | "doc" | "spreadsheet" | "archive" | "other" {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return "image";
  }
  if (["pdf", "docx", "txt", "md"].includes(ext) || mime === "application/pdf") {
    return "doc";
  }
  if (["xlsx", "csv", "xls"].includes(ext)) {
    return "spreadsheet";
  }
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) {
    return "archive";
  }
  return "other";
}

function getFileIcon(category: string) {
  switch (category) {
    case "image":
      return ImageIcon;
    case "doc":
      return FileText;
    case "spreadsheet":
      return FileSpreadsheet;
    case "archive":
      return FileArchive;
    default:
      return FileGenericIcon;
  }
}

export function FilesView({
  projectId,
  projectKey,
  projectOwnerId,
  currentUser,
}: FilesViewProps) {
  const [files, setFiles] = React.useState<ProjectFile[]>([]);
  const [totalStorageUsed, setTotalStorageUsed] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [uploaderFilter, setUploaderFilter] = React.useState<string>("all");

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadMessage, setUploadMessage] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const [zoomImage, setZoomImage] = React.useState<{ url: string; name: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchFiles = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (!res.ok) {
        throw new Error("Failed to load project files");
      }
      const data = await res.json();
      setFiles(data.files || []);
      setTotalStorageUsed(data.totalBytesUsed || 0);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load files");
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    let isMounted = true;
    fetch(`/api/projects/${projectId}/files`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load project files");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setFiles(data.files || []);
          setTotalStorageUsed(data.totalBytesUsed || 0);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load files");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Unique list of uploaders for filter dropdown
  const uniqueUploaders = React.useMemo(() => {
    const map = new Map<string, string>();
    files.forEach((f) => {
      if (f.uploader?._id && f.uploader?.name) {
        map.set(f.uploader._id, f.uploader.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [files]);

  // Upload handler
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const list = Array.from(fileList);
    if (list.length === 0) return;

    for (const file of list) {
      if (file.size > MAX_SINGLE_FILE_SIZE) {
        alert(`"${file.name}" exceeds the 4 MB limit (${formatFileSize(file.size)}).`);
        return;
      }
    }

    setIsUploading(true);
    setUploadMessage(`Uploading ${list.length} file${list.length > 1 ? "s" : ""}...`);

    try {
      for (let i = 0; i < list.length; i++) {
        setUploadMessage(`Uploading file ${i + 1} of ${list.length}...`);
        const file = list[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/projects/${projectId}/files`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to upload "${file.name}"`);
        }
      }

    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      await fetchFiles();
      setIsUploading(false);
      setUploadMessage(null);
    }
  };

  // Delete file handler
  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete file");
      }

      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      setDeleteCandidate(null);
      // Refresh storage count
      fetchFiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const canDelete = (file: ProjectFile) => {
    if (currentUser.role === "admin") return true;
    if (file.uploader?._id && String(file.uploader._id) === String(currentUser.id)) return true;
    if (currentUser.role === "pm" && String(projectOwnerId) === String(currentUser.id)) return true;
    return false;
  };

  // Filtered files
  const filteredFiles = React.useMemo(() => {
    return files.filter((file) => {
      // Search by name
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!file.name.toLowerCase().includes(query)) return false;
      }

      // Filter by type
      if (typeFilter !== "all") {
        const cat = getFileCategory(file.name, file.mime);
        if (cat !== typeFilter) return false;
      }

      // Filter by uploader
      if (uploaderFilter !== "all") {
        if (file.uploader?._id !== uploaderFilter) return false;
      }

      return true;
    });
  }, [files, searchQuery, typeFilter, uploaderFilter]);

  // Quota calculation
  const quotaPercent = Math.min(
    100,
    Math.round((totalStorageUsed / MAX_PROJECT_STORAGE_BYTES) * 100)
  );

  return (
    <div
      className="space-y-6 relative"
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
          handleUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-xs border-2 border-dashed border-primary rounded-xl pointer-events-none transition-all">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 ring-4 ring-primary/20">
            <Upload className="size-8 animate-bounce" />
          </div>
          <p className="text-base font-semibold text-foreground">
            Drop files here to upload to project
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max 4 MB per file. PDFs, images, spreadsheets, documents, archives.
          </p>
        </div>
      )}

      {/* Top Banner: Storage Quota & Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <HardDrive className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Project Storage
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                {formatFileSize(totalStorageUsed)} / 100 MB ({quotaPercent}%)
              </span>
            </div>
            {/* Storage Progress Bar */}
            <div className="w-48 sm:w-64 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  quotaPercent > 90
                    ? "bg-destructive"
                    : quotaPercent > 70
                    ? "bg-amber-500"
                    : "bg-primary"
                }`}
                style={{ width: `${Math.max(2, quotaPercent)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleUploadFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-1.5 text-xs font-medium"
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            <span>{isUploading ? uploadMessage || "Uploading..." : "Upload File"}</span>
          </Button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file name..."
            className="pl-8.5 h-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/30 shrink-0">
            {[
              { id: "all", label: "All" },
              { id: "image", label: "Images" },
              { id: "doc", label: "Docs" },
              { id: "spreadsheet", label: "Sheets" },
              { id: "archive", label: "Zips" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  typeFilter === tab.id
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Uploader Dropdown */}
          {uniqueUploaders.length > 1 && (
            <select
              value={uploaderFilter}
              onChange={(e) => setUploaderFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
            >
              <option value="all">All Uploaders</option>
              {uniqueUploaders.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Files Display */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-border bg-card space-y-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border bg-card">
          <AlertCircle className="size-8 text-destructive mb-2" />
          <p className="text-sm font-semibold text-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={fetchFiles}
          >
            Retry
          </Button>
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={FileGenericIcon}
          title="No files yet"
          description="Upload project documents, design assets, and attachments to share with your team."
          action={
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="size-3.5" />
              <span>Upload first file</span>
            </Button>
          }
        />
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No matching files"
          description="No files match your search query or filter selection."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
                setUploaderFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFiles.map((file) => {
            const category = getFileCategory(file.name, file.mime);
            const isImg = category === "image";
            const Icon = getFileIcon(category);
            const userCanDelete = canDelete(file);

            return (
              <div
                key={file._id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 shadow-2xs hover:border-border/80 hover:shadow-xs transition-all overflow-hidden"
              >
                {/* Header row: Thumbnail/Icon + Name + Actions */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Thumbnail / Icon preview */}
                  {isImg ? (
                    <button
                      type="button"
                      onClick={() =>
                        setZoomImage({
                          url: `/api/files/${file._id}`,
                          name: file.name,
                        })
                      }
                      className="size-11 rounded-lg border border-border overflow-hidden shrink-0 bg-muted/40 hover:opacity-90 transition-opacity cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${file._id}`}
                        alt={file.name}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div className="size-11 rounded-lg border border-border bg-muted/30 flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                      <Icon className="size-5" />
                    </div>
                  )}

                  {/* Name and size */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-xs sm:text-sm font-medium text-foreground truncate"
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                {/* Context badge if attached to task or chat */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {file.taskId ? (
                    <Link
                      href={`/projects/${projectId}/board`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
                      title={`Attached to task: ${file.taskId.title}`}
                    >
                      <span className="font-mono font-semibold">
                        {projectKey ? `${projectKey}-${file.taskId.number}` : `#${file.taskId.number}`}
                      </span>
                      <span className="truncate max-w-[120px]">
                        {file.taskId.title}
                      </span>
                    </Link>
                  ) : file.messageId ? (
                    <Badge variant="outline" size="sm" className="text-[10px] px-1.5 py-0 font-normal">
                      Chat Attachment
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                      Project Asset
                    </Badge>
                  )}
                </div>

                {/* Footer Row: Uploader info + Download & Delete actions */}
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar size="xs">
                      <AvatarFallback className="text-[9px]">
                        {file.uploader?.name ? file.uploader.name[0] : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[90px] text-[11px]">
                      {file.uploader?.name || "Member"}
                    </span>
                    <span className="text-[10px] opacity-75 whitespace-nowrap">
                      • {formatRelativeTime(file.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Download */}
                    <a
                      href={`/api/files/${file._id}`}
                      download={file.name}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Download"
                    >
                      <Download className="size-3.5" />
                    </a>

                    {/* Delete */}
                    {userCanDelete && (
                      deleteCandidate === file._id ? (
                        <div className="flex items-center gap-1 text-[11px] bg-destructive/10 text-destructive border border-destructive/20 rounded px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file._id)}
                            className="font-bold underline hover:opacity-80"
                          >
                            Del
                          </button>
                          <span>/</span>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(null)}
                            className="hover:opacity-80"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(file._id)}
                          className="p-1 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Zoom Image Modal */}
      {zoomImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
              <a
                href={zoomImage.url}
                download={zoomImage.name}
                className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                title="Download"
              >
                <Download className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImage.url}
              alt={zoomImage.name}
              className="max-h-[85vh] w-auto rounded-lg object-contain shadow-2xl border border-white/10"
            />
            <p className="text-xs text-white/80 mt-2 font-mono truncate max-w-md">
              {zoomImage.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
