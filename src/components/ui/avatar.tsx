"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "@/lib/utils";

export interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root> {
  size?: "xs" | "sm" | "default" | "lg" | "xl";
}

const sizeClasses = {
  xs: "size-5 text-[10px]",
  sm: "size-6 text-xs",
  default: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-12 text-base",
};

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full border border-border/40 select-none",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  );
}

/**
 * AvatarStack helper per DESIGN.md:
 * "avatar stack (max 4 then +N)"
 */
export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  totalCount?: number;
}

function AvatarStack({
  className,
  max = 4,
  totalCount,
  children,
  ...props
}: AvatarStackProps) {
  const childrenArray = React.Children.toArray(children);
  const visibleAvatars = childrenArray.slice(0, max);
  const remainingCount =
    typeof totalCount === "number"
      ? Math.max(0, totalCount - max)
      : Math.max(0, childrenArray.length - max);

  return (
    <div
      data-slot="avatar-stack"
      className={cn("flex items-center -space-x-2 overflow-hidden", className)}
      {...props}
    >
      {visibleAvatars.map((child, index) => (
        <div key={index} className="ring-2 ring-background rounded-full">
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          data-slot="avatar-stack-more"
          className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground ring-2 ring-background select-none"
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarStack };
