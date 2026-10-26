"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-top-2",
  {
    variants: {
      variant: {
        default:
          "border-border bg-card text-card-foreground",
        success:
          "border-emerald-500/20 bg-card text-foreground [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20 [&>svg]:text-destructive",
        warning:
          "border-amber-500/20 bg-card text-foreground [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type ToastVariant = "default" | "success" | "destructive" | "warning";

export interface ToastItem {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastsState: ToastItem[] = [];
const listeners: Set<ToastListener> = new Set();

function emitChange() {
  for (const listener of listeners) {
    listener([...toastsState]);
  }
}

export function toast(options: Omit<ToastItem, "id"> & { id?: string }) {
  const id = options.id || Math.random().toString(36).substring(2, 9);
  const newToast: ToastItem = {
    id,
    variant: options.variant || "default",
    duration: options.duration ?? 4000,
    title: options.title,
    description: options.description,
  };

  toastsState = [newToast, ...toastsState.filter((t) => t.id !== id)].slice(0, 5);
  emitChange();

  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, newToast.duration);
  }

  return id;
}

export function dismissToast(id: string) {
  toastsState = toastsState.filter((t) => t.id !== id);
  emitChange();
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>(toastsState);

  React.useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return {
    toasts,
    toast,
    dismiss: dismissToast,
  };
}

function ToastIcon({ variant }: { variant?: ToastVariant }) {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />;
    case "destructive":
      return <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />;
    case "warning":
      return <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />;
    default:
      return <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />;
  }
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:top-0 sm:bottom-auto sm:flex-col sm:max-w-md pointer-events-none"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(toastVariants({ variant: item.variant }))}
        >
          <ToastIcon variant={item.variant} />
          <div className="flex-1 space-y-1">
            {item.title && (
              <h5 className="text-xs sm:text-sm font-semibold leading-tight text-foreground">
                {item.title}
              </h5>
            )}
            {item.description && (
              <p className="text-xs text-muted-foreground leading-normal">
                {item.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="rounded-md p-1 text-muted-foreground/70 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-opacity"
            aria-label="Close notification"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export { toastVariants };
