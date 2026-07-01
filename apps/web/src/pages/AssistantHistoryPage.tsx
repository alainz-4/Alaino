import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AIAgentPanel from "../components/AIAgentPanel";
import { Field } from "../components/Common";
import { api } from "../lib/api";
import { currentMonthKey } from "../lib/dates";
import type { AssistantConversationSummary, AssistantHistoryResponse, BootstrapResponse } from "../types";

type Props = {
  bootstrap: BootstrapResponse | null;
};

type ConversationSection = {
  label: string;
  conversations: AssistantConversationSummary[];
};

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "New";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "New";
  }

  const elapsed = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) {
    return "Just now";
  }

  if (elapsed < hour) {
    const minutes = Math.max(1, Math.round(elapsed / minute));
    return `${minutes}m`;
  }

  if (elapsed < day) {
    const hours = Math.max(1, Math.round(elapsed / hour));
    return `${hours}h`;
  }

  const days = Math.max(1, Math.round(elapsed / day));
  return `${days}d`;
}

function normalizeConversationTitle(conversation: AssistantConversationSummary) {
  return conversation.title?.trim() || "New conversation";
}

function getConversationDate(conversation: AssistantConversationSummary) {
  return new Date(conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt);
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function groupConversations(conversations: AssistantConversationSummary[], search: string): ConversationSection[] {
  const query = search.trim().toLowerCase();
  const sorted = [...conversations].sort((left, right) => {
    const leftTime = getConversationDate(left).getTime();
    const rightTime = getConversationDate(right).getTime();
    return rightTime - leftTime;
  });

  const filtered = query
    ? sorted.filter((conversation) => normalizeConversationTitle(conversation).toLowerCase().includes(query))
    : sorted;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const pinned = filtered.filter((conversation) => conversation.isPinned);
  const rest = filtered.filter((conversation) => !conversation.isPinned);

  const today: AssistantConversationSummary[] = [];
  const yesterdayList: AssistantConversationSummary[] = [];
  const earlier: AssistantConversationSummary[] = [];

  for (const conversation of rest) {
    const date = getConversationDate(conversation);
    if (isSameLocalDay(date, now)) {
      today.push(conversation);
    } else if (isSameLocalDay(date, yesterday)) {
      yesterdayList.push(conversation);
    } else {
      earlier.push(conversation);
    }
  }

  const sections: ConversationSection[] = [];
  if (pinned.length > 0) {
    sections.push({ label: "Pinned", conversations: pinned });
  }
  if (today.length > 0) {
    sections.push({ label: "Today", conversations: today });
  }
  if (yesterdayList.length > 0) {
    sections.push({ label: "Yesterday", conversations: yesterdayList });
  }
  if (earlier.length > 0) {
    sections.push({ label: "Earlier", conversations: earlier });
  }

  return sections;
}

export default function AssistantHistoryPage({ bootstrap }: Props) {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [search, setSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    Pinned: false,
    Today: false,
    Yesterday: false,
    Earlier: false
  });
  const [assistantConversationId, setAssistantConversationId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem("alaino.assistantConversationId");
  });
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (assistantConversationId) {
      window.localStorage.setItem("alaino.assistantConversationId", assistantConversationId);
    } else {
      window.localStorage.removeItem("alaino.assistantConversationId");
    }
  }, [assistantConversationId]);

  async function refreshHistory(nextConversationId = assistantConversationId) {
    setLoadingThreads(true);
    try {
      const query = nextConversationId ? `?conversationId=${encodeURIComponent(nextConversationId)}` : "";
      const history = await api.get<AssistantHistoryResponse>(`/api/assistant/history${query}`);
      setConversations(history.conversations);
      setAssistantConversationId(history.conversationId);
    } catch (error) {
      console.error(error);
      setConversations([]);
    } finally {
      setLoadingThreads(false);
    }
  }

  useEffect(() => {
    void refreshHistory(assistantConversationId ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(() => groupConversations(conversations, search), [conversations, search]);

  function toggleSection(label: string) {
    setCollapsedSections((current) => ({
      ...current,
      [label]: !current[label]
    }));
  }

  async function createConversation() {
    if (creatingConversation) {
      return;
    }

    setCreatingConversation(true);
    try {
      const created = await api.post<AssistantConversationSummary>("/api/assistant/conversations", {});
      setAssistantConversationId(created.id);
      await refreshHistory(created.id);
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingConversation(false);
    }
  }

  async function renameConversation(conversation: AssistantConversationSummary) {
    const nextTitle = window.prompt("Rename conversation", normalizeConversationTitle(conversation));
    if (nextTitle === null) {
      return;
    }

    try {
      await api.patch(`/api/assistant/conversations/${conversation.id}`, { title: nextTitle });
      await refreshHistory(assistantConversationId ?? conversation.id);
    } catch (error) {
      console.error(error);
    }
  }

  async function togglePinned(conversation: AssistantConversationSummary) {
    try {
      await api.patch(`/api/assistant/conversations/${conversation.id}`, { isPinned: !conversation.isPinned });
      await refreshHistory(assistantConversationId ?? conversation.id);
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteConversation(conversation: AssistantConversationSummary) {
    const confirmed = window.confirm(`Delete "${normalizeConversationTitle(conversation)}"?`);
    if (!confirmed) {
      return;
    }

    const remaining = conversations
      .filter((item) => item.id !== conversation.id)
      .sort((left, right) => getConversationDate(right).getTime() - getConversationDate(left).getTime());
    const nextConversationId = remaining[0]?.id ?? null;

    try {
      await api.delete(`/api/assistant/conversations/${conversation.id}`);
      setAssistantConversationId(nextConversationId);
      await refreshHistory(nextConversationId ?? undefined);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="page-stack assistant-history-page">
      <header className="assistant-history-topbar">
        <div className="assistant-history-topbar-copy">
          <div className="eyebrow">Alonso AI</div>
          <div className="assistant-history-topbar-title">History</div>
          <div className="assistant-history-topbar-subtitle">
            Saved conversations for {bootstrap?.profile.fullName ?? "your workspace"}
          </div>
        </div>

        <div className="history-header-actions">
          <Field label="Selected month">
            <input type="month" value={monthKey} onChange={(event) => setMonthKey(event.target.value)} />
          </Field>
          <Link to="/" className="button secondary">
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="assistant-history-shell">
        <aside className="assistant-history-sidebar">
          <div className="assistant-sidebar-top">
            <button className="assistant-new-chat-card" type="button" onClick={() => void createConversation()} disabled={creatingConversation}>
              <span className="assistant-new-chat-icon" aria-hidden="true">
                +
              </span>
              <span className="assistant-new-chat-copy">
                <span className="assistant-new-chat-title">{creatingConversation ? "Creating..." : "New chat"}</span>
                <span className="assistant-new-chat-subtitle">Start a fresh conversation</span>
              </span>
            </button>

            <label className="assistant-search">
              <span>Search</span>
              <input
                type="search"
                value={search}
                placeholder="Find a conversation"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="assistant-sidebar-list" aria-label="Conversation history">
            {loadingThreads ? (
              <div className="assistant-sidebar-empty">Loading conversations...</div>
            ) : sections.length ? (
              sections.map((section) => (
                <section key={section.label} className="assistant-thread-section">
                  <button type="button" className="assistant-thread-section-header" onClick={() => toggleSection(section.label)}>
                    <span className="assistant-thread-section-label">{section.label}</span>
                    <span className={`assistant-thread-section-chevron ${collapsedSections[section.label] ? "collapsed" : ""}`} aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  <div className={`assistant-thread-section-list ${collapsedSections[section.label] ? "collapsed" : ""}`}>
                    {section.conversations.map((conversation) => {
                      const isActive = conversation.id === assistantConversationId;
                      return (
                        <article key={conversation.id} className={`assistant-thread-item ${isActive ? "active" : ""}`}>
                          <button
                            type="button"
                            className="assistant-thread-main"
                            onClick={() => setAssistantConversationId(conversation.id)}
                          >
                            <div className="assistant-thread-title-row">
                              <div className="assistant-thread-title">{normalizeConversationTitle(conversation)}</div>
                              {conversation.isPinned ? <span className="assistant-thread-pin">Pinned</span> : null}
                            </div>
                            <div className="assistant-thread-meta">
                              <span>{conversation.messageCount || 0} messages</span>
                              <span>{formatRelativeTime(conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt)}</span>
                            </div>
                          </button>
                          <div className="assistant-thread-actions">
                            <button
                              type="button"
                              className="assistant-thread-action"
                              onClick={() => void togglePinned(conversation)}
                              aria-label={conversation.isPinned ? "Unpin conversation" : "Pin conversation"}
                              title={conversation.isPinned ? "Unpin" : "Pin"}
                            >
                              <span aria-hidden="true">{conversation.isPinned ? "📍" : "📌"}</span>
                            </button>
                            <button
                              type="button"
                              className="assistant-thread-action"
                              onClick={() => void renameConversation(conversation)}
                              aria-label="Rename conversation"
                              title="Rename"
                            >
                              <span aria-hidden="true">✎</span>
                            </button>
                            <button
                              type="button"
                              className="assistant-thread-action danger"
                              onClick={() => void deleteConversation(conversation)}
                              aria-label="Delete conversation"
                              title="Delete"
                            >
                              <span aria-hidden="true">🗑</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="assistant-sidebar-empty">
                {search.trim() ? "No conversations matched your search." : "Start a new chat to build your history."}
              </div>
            )}
          </div>
        </aside>

        <main className="assistant-history-main">
          <AIAgentPanel
            monthKey={monthKey}
            conversationId={assistantConversationId}
            onConversationChange={setAssistantConversationId}
            onAssistantResponse={() => void refreshHistory(assistantConversationId ?? undefined)}
            showConversationPicker={false}
          />
        </main>
      </section>
    </div>
  );
}
