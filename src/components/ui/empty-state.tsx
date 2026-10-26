import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="flex size-11 items-center justify-center rounded-full bg-muted/80 text-muted-foreground ring-1 ring-border/50 mb-3.5">
          <Icon className="size-5" />
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs sm:text-sm text-muted-foreground leading-normal">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
      {children}
    </div>
  );
}
