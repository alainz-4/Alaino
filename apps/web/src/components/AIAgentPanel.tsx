import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import type {
  AssistantChatMessage,
  AssistantChatResponse,
  AssistantConversationSummary,
  AssistantHistoryResponse
} from "../types";
import { Button, Panel } from "./Common";

type Props = {
  monthKey: string;
  conversationId: string | null;
  onConversationChange: (conversationId: string | null) => void;
  onAssistantResponse?: () => void;
  showConversationPicker?: boolean;
};

const QUICK_PROMPTS = [
  "What should I do this month?",
  "Can I afford more time off next month?",
  "What should I keep aside for taxes and emergency funds?"
];

export default function AIAgentPanel({
  monthKey,
  conversationId,
  onConversationChange,
  onAssistantResponse,
  showConversationPicker = true
}: Props) {
  const assistantName = "Alonso";
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [status, setStatus] = useState<"ready" | "thinking" | "fallback">("ready");
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const element = logRef.current;
    if (!element) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior });
  }

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);

    const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";

    api
      .get<AssistantHistoryResponse>(`/api/assistant/history${query}`)
      .then((history) => {
        if (cancelled) {
          return;
        }

        setConversations(history.conversations);
        if (history.conversationId !== conversationId) {
          onConversationChange(history.conversationId);
        }

        setMessages(history.messages);
        const lastAssistant = [...history.messages].reverse().find((message) => message.role === "assistant");
        setStatus(lastAssistant?.usedAi ? "ready" : "fallback");
        setIsPinnedToBottom(true);
        setShowJumpToLatest(false);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          setMessages([]);
          setConversations([]);
          setStatus("fallback");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, onConversationChange]);

  useLayoutEffect(() => {
    if (isPinnedToBottom) {
      scrollToBottom(messages.length === 0 ? "auto" : "smooth");
      setShowJumpToLatest(false);
    } else {
      setShowJumpToLatest(messages.length > 0);
    }
  }, [messages, isPinnedToBottom]);

  const displayMessages = useMemo(() => {
    if (messages.length > 0) {
      return messages;
    }

    return [
      {
        role: "assistant" as const,
        content: "Ask me about cashflow, taxes, reserves, invoices, clients, or whether a purchase looks safe.",
        createdAt: new Date().toISOString()
      }
    ];
  }, [messages]);

  function formatConversationTitle(input: string) {
    const cleaned = input.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return "New conversation";
    }

    const title = cleaned.split(" ").slice(0, 5).join(" ");
    return title.length > 42 ? `${title.slice(0, 39).trimEnd()}...` : title;
  }

  function handleScroll() {
    const element = logRef.current;
    if (!element) {
      return;
    }

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const nearBottom = distanceFromBottom < 72;
    setIsPinnedToBottom(nearBottom);
    setShowJumpToLatest(!nearBottom && messages.length > 0);
  }

  async function sendMessage(nextText = draft) {
    const trimmed = nextText.trim();
    if (!trimmed || loading) {
      return;
    }

    const optimisticUser: AssistantChatMessage = { role: "user", content: trimmed, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimisticUser]);
    setDraft("");
    setLoading(true);
    setStatus("thinking");

    try {
      const response = await api.post<AssistantChatResponse>("/api/assistant/chat", {
        month: monthKey,
        message: trimmed,
        conversationId
      });

      setMessages((current) => [...current, { role: "assistant", content: response.reply, actionPlan: response.actionPlan, usedAi: response.usedAi }]);
      setStatus(response.usedAi ? "ready" : "fallback");
      setConversations((current) =>
        current.some((item) => item.id === response.conversationId)
          ? current.map((item) =>
              item.id === response.conversationId && (item.title === "New conversation" || item.title === "Accounting assistant")
                ? { ...item, title: formatConversationTitle(trimmed), messageCount: item.messageCount + 2, lastMessageAt: new Date().toISOString() }
                : item
            )
          : [
              {
                id: response.conversationId,
                title: formatConversationTitle(trimmed),
                isPinned: false,
                isArchived: false,
                lastMessageAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messageCount: 2
              },
              ...current
            ]
      );
      onConversationChange(response.conversationId);
      onAssistantResponse?.();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I could not reach the AI service just now, but the planning tabs still work. Try again in a moment.",
          createdAt: new Date().toISOString()
        }
      ]);
      setStatus("fallback");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function createConversation() {
    if (creatingConversation) {
      return;
    }

    setCreatingConversation(true);
    try {
      const created = await api.post<AssistantConversationSummary>("/api/assistant/conversations", {});
      setConversations((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setMessages([]);
      setStatus("ready");
      setIsPinnedToBottom(true);
      setShowJumpToLatest(false);
      onConversationChange(created.id);
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingConversation(false);
    }
  }

  return (
    <Panel
      title="AI accountant"
      subtitle="Ask questions in plain English and get answers based on your current dashboard numbers"
      actions={
        <span className="chip blue">
          {loading || loadingHistory ? "Thinking..." : status === "fallback" ? "Local assistant" : "AI ready"}
        </span>
      }
    >
      <div className="ai-chat">
        {showConversationPicker ? (
          <div className="ai-conversation-bar" aria-label="Assistant conversations">
            <div className="ai-conversation-list">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`ai-conversation-pill ${conversation.id === conversationId ? "active" : ""}`}
                  onClick={() => onConversationChange(conversation.id)}
                  title={`${conversation.messageCount} message${conversation.messageCount === 1 ? "" : "s"}`}
                >
                  <span className="ai-conversation-title">{conversation.title}</span>
                  {conversation.isArchived ? <span className="ai-conversation-badge">Archived</span> : null}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => void createConversation()} disabled={loading || loadingHistory || creatingConversation}>
              {creatingConversation ? "Creating..." : "New conversation"}
            </Button>
          </div>
        ) : null}

        <div className="ai-chat-log" ref={logRef} onScroll={handleScroll}>
          {displayMessages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`ai-bubble ${message.role}`}>
              <div className="ai-bubble-role">{message.role === "assistant" ? assistantName : "You"}</div>
              <div className="ai-bubble-text">{message.content}</div>
            </div>
          ))}
        </div>

        {showJumpToLatest ? (
          <div className="ai-jump-row">
            <Button variant="secondary" onClick={() => scrollToBottom("smooth")}>
              Jump to latest reply
            </Button>
          </div>
        ) : null}

        {status === "fallback" ? (
          <div className="save-feedback info">
            OpenAI is not configured in this workspace, so the assistant is using a local accounting engine instead of a remote AI model.
          </div>
        ) : null}

        <div className="ai-quick-prompts">
          {QUICK_PROMPTS.map((prompt) => (
            <button key={prompt} type="button" className="chip neutral" onClick={() => void sendMessage(prompt)} disabled={loading || loadingHistory}>
              {prompt}
            </button>
          ))}
        </div>

        <div className="ai-input-row">
          <textarea
            rows={3}
            value={draft}
            placeholder="Ask something like: can I afford to take 5 extra days off next month?"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <Button onClick={() => void sendMessage()} disabled={loading || loadingHistory}>
            {loading ? "Thinking..." : "Send"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
