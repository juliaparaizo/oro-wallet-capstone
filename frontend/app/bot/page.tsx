"use client";

import ScreenShell from "../_components/ScreenShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_ACTIONS = [
  "Summarize my spending patterns this month.",
  "Help me plan a $1,200 travel budget.",
  "Find three quick ways to cut $200 this week.",
  "Build me a savings plan for a new laptop.",
];

export default function BotPage() {
  const searchParams = useSearchParams();
  const name = useMemo(() => searchParams.get("name") || "Rebecca", [searchParams]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I can help you turn your transactions into clear next steps. Ask me about budgets, goals, or quick savings wins.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: nextMessages.slice(-6),
          user_name: name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Chat failed");
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError("Pulse is taking longer than usual. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell title="Chat Bot" crumb="Assistant" showTitle={false}>
      <div className="bot-page">
        <section className="bot-hero">
          <div>
            <span className="bot-badge">AI Money Coach</span>
            <h2>Pulse</h2>
            <p>
              Get a clear, confident read on your money. I turn raw transactions
              into choices you can act on today.
            </p>
          </div>
          <div className="bot-orb">
            <div className="bot-orb-ring" />
          </div>
        </section>

        <section className="bot-insights">
          <div className="bot-insight-card">
            <span>Weekly Drift</span>
            <strong>$84</strong>
            <p>Extra spend above your target.</p>
          </div>
          <div className="bot-insight-card">
            <span>Next Paycheck</span>
            <strong>$2,140</strong>
            <p>Projected balance after bills.</p>
          </div>
          <div className="bot-insight-card">
            <span>Goal Momentum</span>
            <strong>68%</strong>
            <p>On track for your travel fund.</p>
          </div>
        </section>

        <section className="bot-chat">
          <header className="bot-chat-header">
            <div>
              <h3>Live chat</h3>
              <span>Responds in seconds · Private to you</span>
            </div>
            <div className="bot-avatar">
              <div className="bot-avatar-core" />
            </div>
          </header>

          <div className="bot-messages">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`bot-message bot-message-${message.role}`}
              >
                <p>{message.content}</p>
              </div>
            ))}
            {loading && (
              <div className="bot-message bot-message-assistant">
                <p className="bot-typing">
                  <span />
                  <span />
                  <span />
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="bot-quick-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                className="bot-chip"
                onClick={() => sendMessage(action)}
              >
                {action}
              </button>
            ))}
          </div>

          <form
            className="bot-input"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <input
              type="text"
              placeholder="Ask about budgets, goals, or recent spending."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
          {error && <p className="bot-error">{error}</p>}
        </section>
      </div>
    </ScreenShell>
  );
}
