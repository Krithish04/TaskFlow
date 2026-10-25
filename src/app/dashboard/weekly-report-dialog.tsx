"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  RotateCcw,
} from "lucide-react";

interface ReportStats {
  total: number;
  done: number;
  inProgress: number;
  review: number;
  todo: number;
  overdue: number;
  atRisk: number;
}

interface WeeklyReportDialogProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WeeklyReportDialog({
  projectId,
  projectName,
  isOpen,
  onClose,
}: WeeklyReportDialogProps) {
  const [report, setReport] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<ReportStats | null>(null);
  const [generatedAt, setGeneratedAt] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const loadReport = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/ai/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate weekly report");
      }

      setReport(data.report || "No report generated.");
      setStats(data.stats || null);
      setGeneratedAt(data.generatedAt || new Date().toISOString());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error generating weekly report"
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    let isMounted = true;

    async function initialize() {
      setIsLoading(true);
      setError(null);
      setCopied(false);

      try {
        const res = await fetch("/api/ai/weekly-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to generate weekly report");
        }

        if (isMounted) {
          setReport(data.report || "No report generated.");
          setStats(data.stats || null);
          setGeneratedAt(data.generatedAt || new Date().toISOString());
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error generating weekly report"
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (isOpen) {
      initialize();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId]);

  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-report-title"
          className="relative w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Sparkles className="size-3" />
                  Gemini Executive PM AI
                </span>
                {generatedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Generated {new Date(generatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h2
                id="weekly-report-title"
                className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2"
              >
                <FileText className="size-5 text-primary" />
                Weekly Status Report: {projectName}
              </h2>
              <p className="text-xs text-muted-foreground">
                AI synthesis of done, in-progress, overdue, and at-risk work with executive recommendations.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 rounded-full shrink-0"
            >
              <X className="size-4" />
              <span className="sr-only">Close report</span>
            </Button>
          </div>

          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 border border-border text-xs">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Done</span>
                  <span className="text-sm font-bold text-foreground">{stats.done} / {stats.total}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Clock className="size-4" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">In Progress</span>
                  <span className="text-sm font-bold text-foreground">{stats.inProgress + stats.review}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <AlertCircle className="size-4" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Overdue</span>
                  <span className="text-sm font-bold text-foreground">{stats.overdue}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">At Risk</span>
                  <span className="text-sm font-bold text-foreground">{stats.atRisk}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-lg p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadReport}
                className="text-xs h-7 gap-1"
              >
                <RotateCcw className="size-3" />
                Retry
              </Button>
            </div>
          )}

          {/* Loading View */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Analyzing tasks and compiling weekly report...
                </p>
                <p className="text-xs text-muted-foreground">
                  Synthesizing accomplishments, overdue deadlines, and resource workload.
                </p>
              </div>
            </div>
          )}

          {/* Report Content View */}
          {!isLoading && report && (
            <div className="space-y-4">
              <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background p-5 text-xs text-foreground/90 leading-relaxed font-sans shadow-inner whitespace-pre-wrap">
                {report}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadReport}
                  disabled={isLoading}
                  className="gap-1.5 text-xs"
                >
                  <RotateCcw className="size-3.5" />
                  Regenerate
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1.5 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        Copied to Clipboard
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        Copy Report
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={onClose}
                    className="text-xs"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
