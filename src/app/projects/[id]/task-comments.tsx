"use client";

import * as React from "react";
import { TaskComment } from "./types";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Loader2, AlertCircle, Sparkles } from "lucide-react";

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [comments, setComments] = React.useState<TaskComment[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);

  // Poll for comments every 5 seconds
  React.useEffect(() => {
    let isMounted = true;

    async function loadComments(showSpinner = false) {
      if (showSpinner) {
        setIsLoading(true);
      }
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`);
        if (!res.ok) {
          throw new Error("Failed to load comments");
        }
        const data = await res.json();
        if (isMounted) {
          setComments(data.comments || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading comments");
        }
      } finally {
        if (isMounted && showSpinner) {
          setIsLoading(false);
        }
      }
    }

    loadComments(true);

    const intervalId = setInterval(() => {
      loadComments(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [taskId]);

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummaryError(null);

    try {
      const res = await fetch("/api/ai/summarize-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to summarize comments");
      }

      setSummary(data.summary || "No comments on this task to summarize yet.");
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : "Error summarizing comments"
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post comment");
      }

      setComments((prev) =>
        prev.some((c) => c._id === data.comment._id)
          ? prev
          : [...prev, data.comment]
      );
      setNewComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error posting comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Comments</h3>
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {comments.length}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSummarize}
          disabled={isSummarizing || comments.length === 0}
          className="gap-1.5 text-xs h-7 border-primary/30 text-primary hover:bg-primary/5 font-medium"
        >
          {isSummarizing ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Summarizing...
            </>
          ) : (
            <>
              <Sparkles className="size-3 text-primary" />
              Summarize
            </>
          )}
        </Button>
      </div>

      {/* Summary Error Alert */}
      {summaryError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-lg p-2.5 text-xs bg-destructive/10 border border-destructive/20 text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{summaryError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSummaryError(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* AI Summary Card */}
      {summary && (
        <div
          role="region"
          aria-label="AI Comment Summary"
          className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 text-xs animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="size-3.5" />
              <span>AI Discussion Summary</span>
            </div>
            <button
              type="button"
              onClick={() => setSummary(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
          <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[12px]">
            {summary}
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg p-2.5 text-xs bg-destructive/10 border border-destructive/20 text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {isLoading && comments.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className="rounded-lg border border-border bg-card/60 p-3 space-y-1.5 text-xs transition-colors hover:bg-card"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-[10px]">
                    {comment.author?.name ? comment.author.name[0].toUpperCase() : "U"}
                  </div>
                  <span className="font-medium text-foreground">
                    {comment.author?.name || "Unknown User"}
                  </span>
                  {comment.author?.role && (
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground/80 px-1 py-0.2 bg-muted rounded">
                      {comment.author.role}
                    </span>
                  )}
                </div>
                <time className="text-[11px] text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p className="text-foreground whitespace-pre-wrap break-words pl-7 text-[13px] leading-relaxed">
                {comment.body}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Post Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          id="task-comment-input"
          aria-label="Write a comment"
          rows={2}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none placeholder:text-muted-foreground"
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || isSubmitting}
            className="gap-1.5 text-xs h-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                Comment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
