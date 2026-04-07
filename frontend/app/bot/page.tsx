"use client";

import ScreenShell from "../_components/ScreenShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Transaction = {
  txnId: string;
  name: string;
  amount: number;
  date: string;
  category?: string;
  currency?: string;
  source?: string;
  plaidPrimary?: string | null;
  plaidDetailed?: string | null;
};

type PlanningGoal = {
  id?: string;
  goalId?: string;
  name: string;
  current: number;
  target: number;
  deadline: string;
};

function formatMessageLines(content: string): string[] {
  return content
    .replace(/(\s)(\d+\.\s)/g, "\n$2")
    .replace(/(\s)([-*]\s)/g, "\n$2")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseTxnDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function mapCategory(raw?: string, primary?: string | null, detailed?: string | null) {
  const candidate = (detailed || raw || primary || "").toString();
  if (!candidate) return "Miscellaneous";
  const c = candidate.toLowerCase();

  if (primary) {
    const p = primary.toLowerCase();
    if (p.includes("food_and_drink")) return "Dining Out";
    if (p.includes("groceries")) return "Groceries";
    if (p.includes("transportation")) return "Transportation";
    if (p.includes("travel")) return "Travel";
    if (p.includes("rent_and_utilities")) return "Housing";
    if (p.includes("utilities")) return "Utilities";
    if (p.includes("healthcare")) return "Healthcare";
    if (p.includes("entertainment")) return "Entertainment";
    if (p.includes("education")) return "Education";
    if (p.includes("general_merchandise") || p.includes("shops")) return "Clothing";
    if (p.includes("personal_care")) return "Personal Care";
    if (p.includes("income") || p.includes("payroll")) return "Income";
    if (p.includes("loan") || p.includes("credit") || p.includes("debt") || p.includes("payments")) return "Debt Payments";
    if (p.includes("transfer") || p.includes("investments") || p.includes("savings")) return "Savings & Investments";
  }

  if (c.includes("rent") || c.includes("mortgage") || c.includes("housing")) return "Housing";
  if (c.includes("utilities") || c.includes("electric") || c.includes("water") || c.includes("internet")) return "Utilities";
  if (c.includes("transport") || c.includes("uber") || c.includes("lyft") || c.includes("fuel") || c.includes("parking")) return "Transportation";
  if (c.includes("grocery") || c.includes("supermarket")) return "Groceries";
  if (c.includes("restaurant") || c.includes("dining") || c.includes("coffee") || c.includes("food")) return "Dining Out";
  if (c.includes("medical") || c.includes("health") || c.includes("pharmacy")) return "Healthcare";
  if (c.includes("personal") || c.includes("beauty") || c.includes("salon")) return "Personal Care";
  if (c.includes("clothing") || c.includes("apparel") || c.includes("shoes") || c.includes("shop")) return "Clothing";
  if (c.includes("entertainment") || c.includes("movie") || c.includes("music") || c.includes("gaming")) return "Entertainment";
  if (c.includes("travel") || c.includes("hotel") || c.includes("air")) return "Travel";
  if (c.includes("education") || c.includes("tuition") || c.includes("school")) return "Education";
  if (c.includes("loan") || c.includes("debt") || c.includes("credit") || c.includes("interest")) return "Debt Payments";
  if (c.includes("savings") || c.includes("investment") || c.includes("invest") || c.includes("transfer")) return "Savings & Investments";
  if (c.includes("income") || c.includes("salary") || c.includes("payroll")) return "Income";
  if (c.includes("tax") || c.includes("irs")) return "Tax";
  return "Miscellaneous";
}

const QUICK_ACTIONS = [
  "Summarize my spending patterns this month.",
  "Help me plan a $1,200 travel budget.",
  "Find three quick ways to cut $200 this week.",
  "Build me a savings plan for a new laptop.",
];

export default function BotPage() {
  const searchParams = useSearchParams();
  const name = useMemo(() => searchParams.get("name") || "Rebecca", [searchParams]);
  const userId = useMemo(() => searchParams.get("userId") || "", [searchParams]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<PlanningGoal[]>([]);
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
  const hasUserMessage = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function loadInsights() {
      try {
        const [transactionsRes, goalsRes] = await Promise.all([
          fetch(`${API_BASE}/transactions?userId=${userId}`),
          fetch(`${API_BASE}/planning/goals?userId=${userId}`),
        ]);

        const transactionsData = await transactionsRes.json();
        const goalsData = await goalsRes.json();

        if (active && transactionsRes.ok) {
          setTransactions(Array.isArray(transactionsData.items) ? transactionsData.items : []);
        }
        if (active && goalsRes.ok) {
          setGoals(Array.isArray(goalsData.items) ? goalsData.items : []);
        }
      } catch {
        if (active) {
          setTransactions([]);
          setGoals([]);
        }
      }
    }

    loadInsights();
    return () => {
      active = false;
    };
  }, [userId]);

  const normalizedTransactions = useMemo(() => {
    return transactions
      .map((transaction) => {
        const dateObj = parseTxnDate(transaction.date);
        const category = mapCategory(
          transaction.category,
          transaction.plaidPrimary,
          transaction.plaidDetailed
        );
        return {
          ...transaction,
          dateObj,
          category,
          spend: transaction.amount > 0 && category !== "Income" ? transaction.amount : 0,
          inflow: transaction.amount < 0 || category === "Income" ? Math.abs(transaction.amount) : 0,
        };
      })
      .filter((transaction) => transaction.dateObj);
  }, [transactions]);

  const anchorDate = useMemo(() => {
    if (normalizedTransactions.length === 0) return new Date();
    return normalizedTransactions
      .map((transaction) => transaction.dateObj as Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
  }, [normalizedTransactions]);

  const currentMonthKey = useMemo(() => monthKey(anchorDate), [anchorDate]);

  const monthTransactions = useMemo(
    () =>
      normalizedTransactions.filter(
        (transaction) => transaction.dateObj && monthKey(transaction.dateObj as Date) === currentMonthKey
      ),
    [normalizedTransactions, currentMonthKey]
  );

  const currentWeekSpend = useMemo(() => {
    const weekStart = new Date(anchorDate);
    weekStart.setDate(anchorDate.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    return monthTransactions
      .filter((transaction) => (transaction.dateObj as Date) >= weekStart)
      .reduce((sum, transaction) => sum + transaction.spend, 0);
  }, [monthTransactions, anchorDate]);

  const weeklyTarget = useMemo(() => {
    const monthlySpend = monthTransactions.reduce((sum, transaction) => sum + transaction.spend, 0);
    return monthlySpend / 4 || 0;
  }, [monthTransactions]);

  const weeklyDrift = Math.max(0, currentWeekSpend - weeklyTarget);

  const incomeTransactions = useMemo(
    () =>
      monthTransactions
        .filter((transaction) => transaction.inflow > 0)
        .sort((a, b) => (b.dateObj as Date).getTime() - (a.dateObj as Date).getTime()),
    [monthTransactions]
  );

  const billSpend = useMemo(
    () =>
      monthTransactions
        .filter(
          (transaction) =>
            transaction.category === "Housing" ||
            transaction.category === "Utilities" ||
            transaction.category === "Debt Payments"
        )
        .reduce((sum, transaction) => sum + transaction.spend, 0),
    [monthTransactions]
  );

  const nextPaycheck = incomeTransactions[0]?.inflow || 0;
  const projectedBalanceAfterBills = Math.max(0, nextPaycheck - billSpend);

  const goalMomentum = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalProgress = goals.reduce((sum, goal) => {
      const current = Number(goal.current ?? 0);
      const target = Number(goal.target ?? 0);
      if (target <= 0) return sum;
      return sum + Math.min(1, current / target);
    }, 0);
    return Math.round((totalProgress / goals.length) * 100);
  }, [goals]);

  const topGoal = useMemo(() => {
    if (goals.length === 0) return null;
    return [...goals]
      .sort((a, b) => {
        const aRatio = Number(a.target) > 0 ? Number(a.current) / Number(a.target) : 0;
        const bRatio = Number(b.target) > 0 ? Number(b.current) / Number(b.target) : 0;
        return bRatio - aRatio;
      })[0];
  }, [goals]);

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
          user_id: userId || undefined,
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
            <strong>{formatMoney(weeklyDrift)}</strong>
            <p>
              {weeklyDrift > 0
                ? "Extra spend above your recent weekly pace."
                : "On track with your recent weekly pace."}
            </p>
          </div>
          <div className="bot-insight-card">
            <span>Next Paycheck</span>
            <strong>{formatMoney(nextPaycheck)}</strong>
            <p>Projected {formatMoney(projectedBalanceAfterBills)} left after core bills.</p>
          </div>
          <div className="bot-insight-card">
            <span>Goal Momentum</span>
            <strong>{goalMomentum}%</strong>
            <p>{topGoal ? `Best progress: ${topGoal.name}.` : "Add a goal to track progress."}</p>
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
                <div className="bot-message-copy">
                  {formatMessageLines(message.content).map((line, lineIndex) => (
                    <p key={`${index}-${lineIndex}`}>{line}</p>
                  ))}
                </div>
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

          {!hasUserMessage && (
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
          )}

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
