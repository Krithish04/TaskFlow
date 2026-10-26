import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive",
        outline:
          "border-border bg-background text-foreground hover:bg-muted/50",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        // Status Variants (DESIGN.md)
        "status-todo":
          "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/20 dark:text-slate-300",
        "status-in-progress":
          "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/20 dark:text-blue-300",
        "status-review":
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/20 dark:text-amber-300",
        "status-done":
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/20 dark:text-emerald-300",
        // Priority Variants (DESIGN.md)
        "priority-low":
          "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/20 dark:text-slate-300",
        "priority-medium":
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/20 dark:text-amber-300",
        "priority-high":
          "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/20 dark:text-rose-300",
      },
      size: {
        default: "text-xs px-2.5 py-0.5",
        sm: "text-[0.7rem] px-2 py-0.5 leading-tight",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

function Badge({
  className,
  variant,
  size,
  dot = false,
  dotColor,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          data-slot="badge-dot"
          className={cn(
            "size-1.5 rounded-full shrink-0",
            dotColor || "bg-current opacity-75"
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
