"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

interface TabsListProps
  extends React.ComponentProps<typeof TabsPrimitive.List> {
  variant?: "line" | "pill";
}

function TabsList({
  className,
  variant = "line",
  ...props
}: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "inline-flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth",
        variant === "line" &&
          "w-full border-b border-border bg-transparent p-0 text-muted-foreground",
        variant === "pill" &&
          "rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps
  extends React.ComponentProps<typeof TabsPrimitive.Tab> {
  variant?: "line" | "pill";
}

function TabsTrigger({
  className,
  variant = "line",
  ...props
}: TabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
        variant === "line" &&
          "relative border-b-2 border-transparent px-3.5 py-2.5 text-muted-foreground hover:text-foreground data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:font-semibold",
        variant === "pill" &&
          "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-xs",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
