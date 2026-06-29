"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface CoachChatActionUi {
  id: string;
  description: string;
  status: string;
  statusLabel: string;
  type: string;
}

interface CoachChatProps {
  initialActions: CoachChatActionUi[];
  plannedWorkoutId?: string;
}

interface ChatTurn {
  id: string;
  message: string;
  role: "coach" | "user";
}

function actionTypeLabel(type: string) {
  return type.toLowerCase().replaceAll("_", " ");
}

function statusTone(status: string) {
  if (status === "APPLIED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "FAILED") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }

  if (status === "DISMISSED") {
    return "border-border bg-muted text-muted-foreground";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function CoachChat({
  initialActions,
  plannedWorkoutId
}: CoachChatProps) {
  const router = useRouter();
  const [actions, setActions] = useState(initialActions);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isPending, startTransition] = useTransition();

  async function askCoach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();

    if (!message || isPending) {
      return;
    }

    setError(null);
    setInput("");
    setTurns((current) => [
      ...current,
      { id: crypto.randomUUID(), message, role: "user" }
    ]);

    startTransition(async () => {
      const response = await fetch("/api/coach/chat", {
        body: JSON.stringify({ message, plannedWorkoutId }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message ?? "Coach chat failed.");
        return;
      }

      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          message: data.message,
          role: "coach"
        }
      ]);
      setActions((current) => [...data.actions, ...current]);
    });
  }

  async function decideAction(actionId: string, decision: "confirm" | "dismiss") {
    setError(null);
    setPendingActionId(actionId);

    const response = await fetch("/api/coach/chat", {
      body: JSON.stringify({ actionId, decision }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    const data = await response.json();

    setPendingActionId(null);

    if (!response.ok) {
      setError(data.error?.message ?? "Coach action failed.");
      return;
    }

    setActions((current) =>
      current.map((action) =>
        action.id === actionId ? data.action : action
      )
    );
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageCircle
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground"
        />
        <h2 className="text-base font-semibold">Coach chat</h2>
      </div>

      <div className="mt-3 space-y-3">
        {turns.map((turn) => (
          <div
            className={`rounded-md border p-3 text-sm leading-6 ${
              turn.role === "user"
                ? "border-primary/20 bg-primary/5"
                : "border-border bg-background"
            }`}
            key={turn.id}
          >
            {turn.message}
          </div>
        ))}
      </div>

      <form action="/api/coach/chat" className="mt-3 space-y-2" onSubmit={askCoach}>
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          name="message"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about today's workout"
          value={input}
        />
        <Button disabled={isPending || !input.trim()} type="submit">
          <Send aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Sending" : "Send"}
        </Button>
      </form>

      {error ? (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold">Suggested actions</h3>
          {actions.map((action) => {
            const canDecide = action.status === "SUGGESTED";

            return (
              <article
                className="rounded-md border border-border p-3"
                key={action.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {actionTypeLabel(action.type)}
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-md border px-2 py-1 text-xs font-medium ${statusTone(
                      action.status
                    )}`}
                  >
                    {action.statusLabel}
                  </span>
                </div>
                {canDecide ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      disabled={pendingActionId === action.id}
                      onClick={() => void decideAction(action.id, "confirm")}
                      size="sm"
                      type="button"
                    >
                      <Check aria-hidden="true" className="h-4 w-4" />
                      Confirm
                    </Button>
                    <Button
                      disabled={pendingActionId === action.id}
                      onClick={() => void decideAction(action.id, "dismiss")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                      Dismiss
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
