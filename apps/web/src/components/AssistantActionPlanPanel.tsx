import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AssistantHistoryResponse } from "../types";
import { Panel } from "./Common";

type Props = {
  className?: string;
  conversationId?: string | null;
  refreshToken?: number;
};

export default function AssistantActionPlanPanel({ className = "", conversationId, refreshToken = 0 }: Props) {
  const [actionPlan, setActionPlan] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";

    api
      .get<AssistantHistoryResponse>(`/api/assistant/history${query}`)
      .then((history) => {
        if (cancelled) {
          return;
        }

        const lastAssistant = [...history.messages].reverse().find((message) => message.role === "assistant");
        setActionPlan(lastAssistant?.actionPlan ?? []);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setActionPlan([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, refreshToken]);

  return (
    <Panel
      title="Action plan"
      subtitle="The latest checklist generated from your assistant conversation"
      className={className}
    >
      {actionPlan.length ? (
        <ol className="ai-plan-list">
          {actionPlan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <p className="assistant-message">Ask the AI a question and the checklist will appear here.</p>
      )}
    </Panel>
  );
}
