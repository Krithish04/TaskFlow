"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Bot,
  Send,
  Loader2,
  AlertCircle,
  RotateCcw,
  Square,
  Sparkles,
} from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantPanelProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  "Which tasks are overdue?",
  "Who is overloaded?",
  "What tasks are currently in progress?",
  "Summarize high priority items",
];

export function AIAssistantPanel({
  projectId,
  projectName,
  isOpen,
  onClose,
}: AIAssistantPanelProps) {
  const initialGreeting = React.useMemo<ChatMessage>(
    () => ({
      id: "welcome",
      role: "assistant",
      content: `Hello! I am your AI project assistant for **${projectName}**.\n\nI have read-only access to your real tasks, assignees, deadlines, and team workload. Ask me questions like who is overloaded, which tasks are overdue, or pick a quick prompt below!`,
    }),
    [projectName]
  );

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    initialGreeting,
  ]);
  const [input, setInput] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, isOpen]);

  // Focus input on panel open
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Escape key listener to close
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleClearChat = () => {
    if (isStreaming) {
      handleStop();
    }
    setMessages([initialGreeting]);
    setError(null);
  };

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isStreaming) return;

    setError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const assistantPlaceholder: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    const nextHistory = [...messages, userMessage];
    setMessages([...nextHistory, assistantPlaceholder]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Build messages payload excluding initial welcome and empty messages, capped at last 20
      const apiMessages = nextHistory
        .filter((m) => m.id !== "welcome" && m.content.trim().length > 0)
        .slice(-20)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Ensure at least the current user message is sent
      if (apiMessages.length === 0) {
        apiMessages.push({ role: "user", content: trimmed });
      }

      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          messages: apiMessages,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errMsg =
          errorData?.error || `Assistant request failed with status ${res.status}`;
        throw new Error(errMsg);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Unable to read streaming response from assistant");
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: accumulated,
            };
          }
          return updated;
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User aborted, keep accumulated text
        return;
      }
      const msg =
        err instanceof Error ? err.message : "Error receiving assistant reply";
      setError(msg);

      // Clean up placeholder if empty
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="AI Project Assistant"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform animate-in slide-in-from-right duration-200 sm:max-w-lg">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Bot className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-foreground">
                  Project Assistant
                </h2>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Read-only
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[220px] sm:max-w-[280px]">
                {projectName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              title="Reset conversation"
              aria-label="Reset conversation"
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Close panel"
              aria-label="Close assistant panel"
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="border-b border-border/60 bg-muted/10 px-4 py-2.5">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <Sparkles className="size-3 text-primary" /> Suggested questions:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isStreaming}
                onClick={() => sendMessage(q)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Chat messages"
          className="flex-1 overflow-y-auto p-4 space-y-4 focus:outline-hidden"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-xs ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-xs"
                    : "bg-muted/60 text-foreground border border-border/80 rounded-bl-xs"
                }`}
              >
                {m.role === "assistant" ? (
                  m.content ? (
                    <FormattedMessage content={m.content} />
                  ) : isStreaming ? (
                    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      <span>Analyzing project tasks...</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      No response
                    </span>
                  )
                ) : (
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">
                    {m.content}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Assistant Error</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border bg-background p-4"
        >
          <div className="relative flex items-end rounded-lg border border-border bg-card shadow-xs focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder="Ask about overdue tasks, workload, blockers..."
              className="w-full resize-none bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden disabled:opacity-60"
            />
            <div className="p-2">
              {isStreaming ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleStop}
                  title="Stop generating"
                  className="size-7 rounded-md border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Square className="size-3 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  title="Send message"
                  className="size-7 rounded-md"
                >
                  <Send className="size-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-muted-foreground">
            <span>Press Enter to send, Shift + Enter for new line</span>
            <span>Read-only assistant</span>
          </div>
        </form>
      </aside>
    </div>
  );
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-2" />;
        }

        if (line.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="font-bold text-foreground text-xs mt-2 mb-1"
            >
              {renderInline(line.slice(4))}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className="font-bold text-foreground text-sm mt-2 mb-1"
            >
              {renderInline(line.slice(3))}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2
              key={idx}
              className="font-bold text-foreground text-sm mt-3 mb-1"
            >
              {renderInline(line.slice(2))}
            </h2>
          );
        }

        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-2 my-0.5">
              <span className="text-primary font-bold">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }

        const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-2 my-0.5">
              <span className="text-primary font-medium">{numMatch[1]}.</span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
