"use client";

import ScreenShell from "../_components/ScreenShell";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Transaction = {
  txnId: string;
  name: string;
  amount: number;
  date: string;
  category?: string;
  currency?: string;
  source?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const EVENT_TYPES = [
  "Budget Reset",
  "Bills",
  "Payday",
  "Recurring",
  "Savings",
  "Debt",
  "Goals",
  "Tax",
  "Alerts",
  "Low Balance"
];

function parseDate(value: string) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const userId = useMemo(() => searchParams.get("userId") || "", [searchParams]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dailyBudget, setDailyBudget] = useState<string>("");
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [eventLabel, setEventLabel] = useState("");
  const [eventsByDate, setEventsByDate] = useState<Record<string, Array<{ label: string; type: string }>>>({});

  useEffect(() => {
    if (!userId) return;
    const key = `oro_calendar_events_${userId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setEventsByDate(JSON.parse(saved));
      } catch {
        setEventsByDate({});
      }
    }
    const budgetKey = `oro_daily_budget_${userId}`;
    const savedBudget = localStorage.getItem(budgetKey);
    if (savedBudget) setDailyBudget(savedBudget);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/transactions?userId=${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to load");
        if (active) setTransactions(data.items || []);
      } catch (err) {
        if (active) setError("Unable to load transactions.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const today = new Date();
  const inferredDate = useMemo(() => {
    if (transactions.length === 0) return today;
    const latest = transactions
      .map((t) => parseDate(t.date))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return latest || today;
  }, [transactions, today]);

  const year = inferredDate.getFullYear();
  const month = inferredDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day?: number; isToday?: boolean }> = [];

  const monthLabel = inferredDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });

  const transactionsByDay = useMemo(() => {
    const map: Record<number, Transaction[]> = {};
    for (const t of transactions) {
      const d = parseDate(t.date);
      if (!d) continue;
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const day = d.getDate();
      map[day] = map[day] || [];
      map[day].push(t);
    }
    return map;
  }, [transactions, year, month]);

  const selectedTransactions = selectedDay ? transactionsByDay[selectedDay] || [] : [];
  const selectedTotal = selectedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const budgetValue = Number(dailyBudget);
  const hasBudget = !Number.isNaN(budgetValue) && budgetValue > 0;
  const budgetDiff = hasBudget ? selectedTotal - budgetValue : 0;

  function handleSaveEvent() {
    if (!selectedDay || !userId) return;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    const next = { ...eventsByDate };
    next[key] = next[key] || [];
    next[key].push({
      label: eventLabel.trim() || eventType,
      type: eventType.toLowerCase().replace(/\s+/g, "-")
    });
    setEventsByDate(next);
    localStorage.setItem(`oro_calendar_events_${userId}`, JSON.stringify(next));
    setEventLabel("");
    setShowEventForm(false);
  }

  function handleSaveBudget() {
    if (!userId) return;
    localStorage.setItem(`oro_daily_budget_${userId}`, dailyBudget);
    setShowBudgetForm(false);
  }

  for (let i = 0; i < startDay; i += 1) {
    cells.push({});
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
    cells.push({ day, isToday });
  }
  while (cells.length % 7 !== 0) {
    cells.push({});
  }

  return (
    <ScreenShell title="Calendar">
      <div className="calendar">
        <div className="calendar-header">{monthLabel}</div>
        <div className="calendar-actions">
          <button className="button" onClick={() => setShowBudgetForm((v) => !v)}>
            {showBudgetForm ? "Close Budget Goal" : "Set Daily Budget"}
          </button>
          <button className="button" onClick={() => setShowEventForm((v) => !v)}>
            {showEventForm ? "Close Important Date" : "Add Important Date"}
          </button>
        </div>
        {showBudgetForm && (
          <div className="calendar-panel">
            <div className="note-row">
              <span className="note-label">Daily Budget Goal</span>
              <span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  style={{ maxWidth: 120 }}
                />
                <button className="button" style={{ marginLeft: 8 }} onClick={handleSaveBudget}>
                  Save
                </button>
              </span>
            </div>
          </div>
        )}
        {showEventForm && (
          <div className="calendar-panel">
            <div className="note-row">
              <span className="note-label">Add Important Date</span>
              <span>
                <select
                  className="input"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="text"
                  placeholder="Optional label"
                  value={eventLabel}
                  onChange={(e) => setEventLabel(e.target.value)}
                  style={{ maxWidth: 160, marginLeft: 8 }}
                />
                <button className="button" style={{ marginLeft: 8 }} onClick={handleSaveEvent}>
                  Add
                </button>
              </span>
            </div>
          </div>
        )}
        <div className="calendar-legend">
          <span className="tag budget">Budget Reset</span>
          <span className="tag bill">Bills</span>
          <span className="tag payday">Payday</span>
          <span className="tag recurring">Recurring</span>
          <span className="tag savings">Savings</span>
          <span className="tag debt">Debt</span>
          <span className="tag goal">Goals</span>
          <span className="tag tax">Tax</span>
          <span className="tag alert">Alerts</span>
          <span className="tag warning">Low Balance</span>
        </div>
        <div className="calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="calendar-dayname">
              {day}
            </div>
          ))}
          {cells.map((cell, idx) => (
            <div
              key={`${cell.day ?? "empty"}-${idx}`}
              className={`calendar-day${cell.day ? "" : " is-muted"}${
                cell.isToday ? " is-today" : ""
              }${cell.day && cell.day === selectedDay ? " is-selected" : ""}`}
              onClick={() => cell.day && setSelectedDay(cell.day)}
            >
              {cell.day ?? ""}
              {cell.day && (
                <div className="calendar-dots">
                  {(eventsByDate[
                    `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`
                  ] || [])
                    .slice(0, 3)
                    .map((event, eidx) => (
                      <span
                        key={`${event.type}-${eidx}`}
                        className={`dot ${event.type}`}
                        title={event.label}
                      />
                    ))}
                  {(transactionsByDay[cell.day] || []).slice(0, 1).map((_, eidx) => (
                    <span key={`spend-${eidx}`} className="dot alert" title="Spending" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {loading && <p style={{ color: "#7b7b85" }}>Loading...</p>}
        {error && <p style={{ color: "#b00020" }}>{error}</p>}

        <div className="calendar-notes">
          <div className="note-row">
            <span className="note-label">Selected Day</span>
            <span>{selectedDay ? `${monthLabel} ${selectedDay}` : "Tap a day"}</span>
          </div>
          <div className="note-row">
            <span className="note-label">Total Spend</span>
            <span>${selectedTotal.toFixed(2)}</span>
          </div>
          {hasBudget && selectedDay && (
            <div className="note-row">
              <span className="note-label">Budget Status</span>
              <span style={{ color: budgetDiff > 0 ? "#b00020" : "#2e7d32" }}>
                {budgetDiff > 0
                  ? `Over budget by $${budgetDiff.toFixed(2)}`
                  : `Under budget by $${Math.abs(budgetDiff).toFixed(2)}`}
              </span>
            </div>
          )}
          <div className="note-row">
            <span className="note-label">Transactions</span>
            <div className="calendar-txn-list">
              {selectedTransactions.length === 0 && <div>No spend</div>}
              {selectedTransactions.slice(0, 6).map((t) => (
                <div key={t.txnId} className="calendar-txn-row">
                  <span>{t.name}</span>
                  <span>${t.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
