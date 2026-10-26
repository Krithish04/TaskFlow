"use client";

import * as React from "react";
import {
  Paperclip,
  Plus,
  Download,
  X,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  File as FileGenericIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TaskFile {
  _id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
  uploader?: {
    _id: string;
    name: string;
  };
}

interface TaskAttachmentsProps {
  taskId: string;
  projectId: string;
  canEdit: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string, mime: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) {
    return ImageIcon;
  }
  if (ext === "pdf" || mime === "application/pdf") {
    return FileText;
  }
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext || "")) {
    return FileArchive;
  }
  if (["csv", "xlsx", "xls"].includes(ext || "")) {
    return FileSpreadsheet;
  }
  return FileGenericIcon;
}

export function TaskAttachments({
  taskId,
  projectId,
  canEdit,
}: TaskAttachmentsProps) {
  const [files, setFiles] = React.useState<TaskFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAttachingExisting, setIsAttachingExisting] = React.useState(false);
  const [availableProjectFiles, setAvailableProjectFiles] = React.useState<TaskFile[]>([]);
  const [showAttachPicker, setShowAttachPicker] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchTaskFiles = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  React.useEffect(() => {
    let isMounted = true;
    fetch(`/api/projects/${projectId}/files?taskId=${taskId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setFiles(data.files || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, taskId]);

  // Load existing unattached project files when opening the attach picker
  const handleOpenAttachPicker = async () => {
    setShowAttachPicker(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (res.ok) {
        const data = await res.json();
        // Filter files that are not attached to any task
        const unattached = (data.files || []).filter(
          (f: { _id: string; taskId?: unknown }) => !f.taskId
        );
        setAvailableProjectFiles(unattached);
      }
    } catch {
      // Ignore
    }
  };

  // Upload new file directly attached to this task
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert(`File "${file.name}" exceeds the 4 MB limit (${formatFileSize(file.size)}).`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", taskId);

      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload file");
      }

      await fetchTaskFiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Attach existing project file to this task
  const handleAttachExisting = async (fileId: string) => {
    setIsAttachingExisting(true);
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to attach file");
      }

      setShowAttachPicker(false);
      await fetchTaskFiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to attach file");
    } finally {
      setIsAttachingExisting(false);
    }
  };

  // Detach file from this task
  const handleDetachFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to detach file");
      }

      setFiles((prev) => prev.filter((f) => f._id !== fileId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to detach file");
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          <Paperclip className="size-3.5" />
          <span>Attachments ({files.length})</span>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleUploadFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-xs px-2 gap-1 rounded-md"
            >
              {isUploading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Plus className="size-3" />
              )}
              <span>Upload</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenAttachPicker}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            >
              Choose Existing
            </Button>
          </div>
        )}
      </div>

      {/* Attach Existing Modal / Dropdown Tray */}
      {showAttachPicker && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span>Attach an existing project file</span>
            <button
              type="button"
              onClick={() => setShowAttachPicker(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {availableProjectFiles.length === 0 ? (
            <p className="text-muted-foreground italic py-1">
              No other project files available to attach.
            </p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {availableProjectFiles.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-background border border-border"
                >
                  <span className="truncate font-medium">{item.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatFileSize(item.size)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isAttachingExisting}
                      onClick={() => handleAttachExisting(item._id)}
                      className="h-6 text-[10px] px-1.5"
                    >
                      Attach
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List of Attached Files */}
      {loading ? (
        <div className="space-y-1.5">
          <div className="h-9 rounded-lg bg-muted/40 animate-pulse" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground italic rounded-lg border border-dashed border-border p-3 text-center">
          No files attached to this task.
        </p>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => {
            const Icon = getFileIcon(file.name, file.mime);
            const isImg = file.mime.startsWith("image/");

            return (
              <div
                key={file._id}
                className="group flex items-center justify-between gap-2.5 p-2 rounded-lg border border-border bg-card text-xs hover:border-border/80 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/${file._id}`}
                      alt={file.name}
                      className="size-7 rounded object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="size-7 rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      <Icon className="size-3.5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/api/files/${file._id}`}
                    download={file.name}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Download"
                  >
                    <Download className="size-3.5" />
                  </a>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDetachFile(file._id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                      title="Detach from task"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
