"use client";

import * as React from "react";
import {
  Send,
  Paperclip,
  X,
  FileText,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  Download,
  Trash2,
  ChevronDown,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  AlertCircle,
  File as FileGenericIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function matchesId(a: unknown, b: unknown): boolean {
  if (!a || !b) return false;
  return String(a) === String(b);
}

export interface ChatAttachment {
  _id: string;
  name: string;
  mime: string;
  size: number;
  storageId?: string;
  createdAt?: string;
}

export interface ChatAuthor {
  _id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface ChatMessage {
  _id: string;
  project: string;
  author: ChatAuthor;
  body: string;
  attachments: ChatAttachment[];
  createdAt: string;
  deletedAt?: string | null;
}

interface StagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  isImage: boolean;
  previewUrl?: string;
}

interface ChatViewProps {
  projectId: string;
  projectOwnerId: string;
  currentUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_ATTACHMENTS = 5;

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
  if (["json", "js", "ts", "html", "md", "txt"].includes(ext || "")) {
    return FileCode;
  }
  return FileGenericIcon;
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80 transition-opacity break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function ChatView({
  projectId,
  projectOwnerId,
  currentUser,
}: ChatViewProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [bodyText, setBodyText] = React.useState("");
  const [stagedFiles, setStagedFiles] = React.useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);

  const [isDragging, setIsDragging] = React.useState(false);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = React.useState(false);
  const [zoomImage, setZoomImage] = React.useState<{ url: string; name: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = React.useState<string | null>(null);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const latestTimestampRef = React.useRef<string | null>(null);
  const isNearBottomRef = React.useRef(true);
  const isFirstLoadRef = React.useRef(true);

  // Mark project read
  const markAsRead = React.useCallback(async () => {
    try {
      await fetch(`/api/projects/${projectId}/messages/read`, { method: "POST" });
    } catch {
      // Ignore background read error
    }
  }, [projectId]);

  // Initial load
  React.useEffect(() => {
    let isMounted = true;

    async function loadInitialMessages() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/messages?limit=100`);
        if (!res.ok) {
          throw new Error("Failed to load project messages");
        }
        const data = await res.json();
        if (isMounted) {
          const list: ChatMessage[] = data.messages || [];
          setMessages(list);
          if (list.length > 0) {
            latestTimestampRef.current = list[list.length - 1].createdAt;
          }
          setLoading(false);
          markAsRead();
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load messages");
          setLoading(false);
        }
      }
    }

    loadInitialMessages();

    return () => {
      isMounted = false;
    };
  }, [projectId, markAsRead]);

  // 3s Polling that pauses when document is hidden
  React.useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const pollNewMessages = async () => {
      if (document.visibilityState !== "visible") return;
      if (loading) return;

      try {
        const after = latestTimestampRef.current;
        const qs = after
          ? `after=${encodeURIComponent(after)}&limit=50`
          : `limit=50`;
        const res = await fetch(`/api/projects/${projectId}/messages?${qs}`);
        if (!res.ok) return;

        const data = await res.json();
        const incoming: ChatMessage[] = data.messages || [];

        if (isMounted && incoming.length > 0) {
          let hasFresh = false;
          setMessages((prev) => {
            const existing = new Set(prev.map((m) => m._id));
            const fresh = incoming.filter((m) => !existing.has(m._id));
            if (fresh.length === 0) return prev;
            hasFresh = true;
            return [...prev, ...fresh];
          });

          const lastIncoming = incoming[incoming.length - 1];
          if (!latestTimestampRef.current || lastIncoming.createdAt > latestTimestampRef.current) {
            latestTimestampRef.current = lastIncoming.createdAt;
          }

          if (hasFresh) {
            if (isNearBottomRef.current) {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 50);
            } else {
              setHasNewMessagesBelow(true);
            }
          }

          markAsRead();
        }
      } catch {
        // Silently tolerate intermittent connection drops
      }
    };

    intervalId = setInterval(pollNewMessages, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollNewMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [projectId, markAsRead, loading]);

  // Auto-scroll on initial load
  React.useEffect(() => {
    if (!loading && isFirstLoadRef.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstLoadRef.current = false;
    }
  }, [loading, messages]);

  // Handle scroll to detect whether reading older messages
  const handleScroll = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceToBottom < 100;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setHasNewMessagesBelow(false);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessagesBelow(false);
  };

  // Add files to staging
  const addFilesToStaged = (incomingFiles: FileList | File[]) => {
    const filesArray = Array.from(incomingFiles);
    if (stagedFiles.length + filesArray.length > MAX_ATTACHMENTS) {
      alert(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      return;
    }

    const nextStaged: StagedFile[] = [];
    for (const file of filesArray) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" exceeds the 4 MB limit (${formatFileSize(file.size)}).`);
        continue;
      }
      const isImg = file.type.startsWith("image/");
      const preview = isImg ? URL.createObjectURL(file) : undefined;
      nextStaged.push({
        id: Math.random().toString(36).substring(2),
        file,
        name: file.name,
        size: file.size,
        isImage: isImg,
        previewUrl: preview,
      });
    }

    setStagedFiles((prev) => [...prev, ...nextStaged].slice(0, MAX_ATTACHMENTS));
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToStaged(e.dataTransfer.files);
    }
  };

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      addFilesToStaged(e.clipboardData.files);
    }
  };

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = bodyText.trim();
    if (!text && stagedFiles.length === 0) return;
    if (isUploading) return;

    setIsUploading(true);
    setUploadStatus(stagedFiles.length > 0 ? "Uploading attachments..." : "Sending...");

    try {
      const uploadedFileIds: string[] = [];

      // Step 1: Upload attachments to POST /api/projects/[id]/files
      for (let i = 0; i < stagedFiles.length; i++) {
        setUploadStatus(`Uploading file ${i + 1} of ${stagedFiles.length}...`);
        const item = stagedFiles[i];
        const formData = new FormData();
        formData.append("file", item.file);

        const res = await fetch(`/api/projects/${projectId}/files`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to upload "${item.name}"`);
        }

        const data = await res.json();
        uploadedFileIds.push(data.file._id || data.file.id);
      }

      // Step 2: Post Message with fileIds to POST /api/projects/[id]/messages
      setUploadStatus("Posting message...");
      const resMsg = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          fileIds: uploadedFileIds,
        }),
      });

      if (!resMsg.ok) {
        const errData = await resMsg.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send message");
      }

      const msgData = await resMsg.json();
      const newMsg: ChatMessage = msgData.message;

      // Clean up staged previews
      stagedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setStagedFiles([]);
      setBodyText("");

      // Append and update latest timestamp
      setMessages((prev) =>
        prev.some((m) => m._id === newMsg._id) ? prev : [...prev, newMsg]
      );
      if (!latestTimestampRef.current || newMsg.createdAt > latestTimestampRef.current) {
        latestTimestampRef.current = newMsg.createdAt;
      }

      // Always scroll to bottom when user sends a message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to post message");
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete message");
      }

      // Optimistically remove from state
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      setDeleteCandidate(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete message");
    }
  };

  const canDelete = (msg: ChatMessage) => {
    if (currentUser.role === "admin") return true;
    if (matchesId(msg.author._id, currentUser.id)) return true;
    if (currentUser.role === "pm" && matchesId(projectOwnerId, currentUser.id)) return true;
    return false;
  };

  return (
    <div
      className="relative flex flex-col h-[calc(100vh-14rem)] min-h-[520px] rounded-xl border border-border bg-card shadow-xs overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-xs border-2 border-dashed border-primary rounded-xl pointer-events-none transition-all">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 ring-4 ring-primary/20">
            <Paperclip className="size-8 animate-bounce" />
          </div>
          <p className="text-base font-semibold text-foreground">
            Drop files here to attach
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Up to 5 files (max 4 MB each: images, documents, spreadsheets)
          </p>
        </div>
      )}

      {/* Screen reader live region */}
      <div aria-live="polite" className="sr-only">
        {messages.length > 0 && `Loaded ${messages.length} messages`}
      </div>

      {/* Chat Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Project chat message history"
        aria-live="polite"
        aria-relevant="additions text"
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4 sm:px-6"
      >
        {loading ? (
          <div className="space-y-4 py-4">
            <div className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="space-y-1.5 w-1/3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <div className="space-y-1.5 w-2/5 flex flex-col items-end">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <Skeleton className="size-8 rounded-full shrink-0" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="space-y-1.5 w-1/2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="size-8 text-destructive mb-2" />
            <p className="text-sm font-semibold text-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description="Be the first to post a message or drop project files to discuss with the team."
              className="border-dashed bg-muted/10 max-w-md"
            />
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = matchesId(msg.author._id, currentUser.id);
            const userAllowedDelete = canDelete(msg);
            const msgDate = new Date(msg.createdAt);
            const showDateHeader =
              idx === 0 ||
              new Date(messages[idx - 1].createdAt).toDateString() !== msgDate.toDateString();

            return (
              <React.Fragment key={msg._id}>
                {showDateHeader && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted/80 text-muted-foreground border border-border/50">
                      {msgDate.toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                <div
                  className={`group relative flex gap-3 ${
                    isOwn ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Author Avatar */}
                  <Avatar size="sm" className="shrink-0 mt-0.5">
                    <AvatarFallback className="text-[11px]">
                      {msg.author.name
                        ? msg.author.name.slice(0, 2).toUpperCase()
                        : "U"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Bubble Container */}
                  <div
                    className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                      isOwn ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 px-1">
                      <span className="font-medium text-foreground">
                        {isOwn ? "You" : msg.author.name || "Team Member"}
                      </span>
                      {msg.author.role === "admin" && (
                        <Badge variant="outline" size="sm" className="text-[9px] px-1 py-0">
                          Admin
                        </Badge>
                      )}
                      {matchesId(msg.author._id, projectOwnerId) && (
                        <Badge variant="outline" size="sm" className="text-[9px] px-1 py-0">
                          PM
                        </Badge>
                      )}
                      <span className="text-[10px] opacity-75">
                        {msgDate.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-sm transition-all shadow-2xs ${
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-tr-xs"
                          : "bg-muted/70 text-foreground border border-border/60 rounded-tl-xs"
                      }`}
                    >
                      {/* Text Body */}
                      {msg.body && (
                        <div className="whitespace-pre-wrap break-words leading-relaxed select-text">
                          {linkify(msg.body)}
                        </div>
                      )}

                      {/* Attachments List */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div
                          className={`space-y-2 ${
                            msg.body ? "mt-2.5 pt-2.5 border-t border-current/15" : ""
                          }`}
                        >
                          {msg.attachments.map((file) => {
                            const isImg = file.mime.startsWith("image/");
                            const IconComponent = getFileIcon(file.name, file.mime);

                            return (
                              <div key={file._id} className="min-w-[180px]">
                                {isImg ? (
                                  <div className="space-y-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setZoomImage({
                                          url: `/api/files/${file._id}`,
                                          name: file.name,
                                        })
                                      }
                                      className="block overflow-hidden rounded-lg border border-current/20 hover:opacity-90 transition-opacity cursor-zoom-in"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={`/api/files/${file._id}`}
                                        alt={file.name}
                                        className="max-h-48 w-auto rounded-lg object-contain bg-black/10"
                                        loading="lazy"
                                      />
                                    </button>
                                    <div className="flex items-center justify-between text-[11px] opacity-80 px-0.5">
                                      <span className="truncate max-w-[140px] font-mono">
                                        {file.name}
                                      </span>
                                      <a
                                        href={`/api/files/${file._id}`}
                                        download={file.name}
                                        className="hover:underline flex items-center gap-1"
                                      >
                                        <Download className="size-3" />
                                        <span>{formatFileSize(file.size)}</span>
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs ${
                                      isOwn
                                        ? "bg-black/15 border-white/20"
                                        : "bg-background border-border"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <IconComponent className="size-4 shrink-0 opacity-80" />
                                      <div className="min-w-0">
                                        <p className="font-medium truncate max-w-[160px]">
                                          {file.name}
                                        </p>
                                        <p className="text-[10px] opacity-75">
                                          {formatFileSize(file.size)}
                                        </p>
                                      </div>
                                    </div>

                                    <a
                                      href={`/api/files/${file._id}`}
                                      download={file.name}
                                      className="p-1.5 rounded-md hover:bg-current/15 transition-colors shrink-0"
                                      title="Download file"
                                      aria-label={`Download ${file.name}`}
                                    >
                                      <Download className="size-3.5" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Delete Action Trigger */}
                    {userAllowedDelete && (
                      <div
                        className={`flex items-center mt-1 px-1 transition-opacity ${
                          deleteCandidate === msg._id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {deleteCandidate === msg._id ? (
                          <div className="flex items-center gap-1.5 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md px-2 py-0.5">
                            <span>Delete message?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="font-bold underline hover:opacity-80"
                            >
                              Yes
                            </button>
                            <span>/</span>
                            <button
                              type="button"
                              onClick={() => setDeleteCandidate(null)}
                              className="hover:opacity-80"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(msg._id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                            title="Delete message"
                            aria-label="Delete message"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating "New Messages ↓" indicator */}
      {hasNewMessagesBelow && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <Button
            size="sm"
            variant="default"
            onClick={scrollToBottom}
            className="shadow-md gap-1.5 text-xs rounded-full py-1 h-7"
          >
            <ChevronDown className="size-3.5" />
            <span>New messages</span>
          </Button>
        </div>
      )}

      {/* Staged Attachments Preview Bar */}
      {stagedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {stagedFiles.map((item) => (
            <div
              key={item.id}
              className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-card shadow-xs text-xs shrink-0 max-w-[200px]"
            >
              {item.isImage && item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="size-7 rounded object-cover shrink-0"
                />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(item.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeStagedFile(item.id)}
                className="size-4 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 ml-1"
                aria-label={`Remove attachment ${item.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-1">
            {stagedFiles.length}/{MAX_ATTACHMENTS} files
          </span>
        </div>
      )}

      {/* Uploading Status Banner */}
      {isUploading && (
        <div className="px-4 py-1.5 bg-primary/10 border-t border-primary/20 text-xs text-primary flex items-center gap-2 font-medium">
          <Loader2 className="size-3.5 animate-spin shrink-0" />
          <span>{uploadStatus || "Processing..."}</span>
        </div>
      )}

      {/* Pinned Bottom Composer */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 sm:p-4 border-t border-border bg-card/80 backdrop-blur-xs flex items-end gap-2"
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFilesToStaged(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Attach button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading || stagedFiles.length >= MAX_ATTACHMENTS}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 w-9 p-0 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          title={`Attach files (max ${MAX_ATTACHMENTS}, 4 MB each)`}
          aria-label={`Attach files (up to ${MAX_ATTACHMENTS} files, max 4 MB each)`}
        >
          <Paperclip className="size-4" />
        </Button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={bodyText}
            disabled={isUploading}
            onChange={(e) => setBodyText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            aria-label="Chat message"
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-32 min-h-[38px] leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          size="sm"
          disabled={isUploading || (!bodyText.trim() && stagedFiles.length === 0)}
          aria-label="Send message"
          className="h-9 px-3.5 shrink-0 rounded-lg gap-1.5 font-medium"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Send className="size-3.5" />
              <span className="hidden sm:inline">Send</span>
            </>
          )}
        </Button>
      </form>

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
                aria-label={`Download image ${zoomImage.name}`}
              >
                <Download className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                title="Close"
                aria-label="Close image preview"
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
